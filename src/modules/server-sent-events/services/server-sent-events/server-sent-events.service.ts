import { isObject } from '@src/common/utils/isObject';
import { parseJson } from '@src/common/utils/parseJson';
import { getTopicEventsChannel, getUserEventsChannel, SSE_MAX_ENVELOPE_BYTES } from '@src/core/services/sse-publisher';
import { isControlMessage, SseControlTypes } from '@src/core/services/sse-topics';
import { SseCloseReasons } from '../../logic/constants';
import { formatSseMessage } from '../../logic/utils/format-sse-message';
import type { LoggerService } from '@src/core/services/logger';
import type { SseEnvelope } from '@src/core/services/sse-publisher';
import type { SseControlMessage, SseTopicsService } from '@src/core/services/sse-topics';
import type { SseChannelSubscriberService } from '../sse-channel-subscriber';
import type {
  JoinTopicProps,
  LeaveTopicProps,
  SseConnectionsService,
  StartHoldingControlMessagesProps,
  StopHoldingControlMessagesProps,
  SubscribeToTopicEventsProps,
} from '../sse-connections';
import type {
  ApplyControlMessageProps,
  CompleteTopicsLoadProps,
  ForwardEnvelopeToTopicProps,
  HandleControlMessageProps,
  HandleUserChannelMessageProps,
  SubscribeToUserEventsProps,
  SubscribeToUserTopicsProps,
} from './types';

/**
 * Bridges Redis pub/sub and this node's SSE connections (the receiving side; publishing is SsePublisherService).
 * - Per user: a node subscribes to a user's channel only while it holds a connection of that user.
 * - Per topic: a node subscribes to a topic's channel only while it holds a connection in that topic.
 *
 * The user's channel also carries control messages, published by SseTopicsService: topic-joined / topic-left when
 * the user's topics change, and session-ended when the user's connections must close (e.g. logout).
 * They update the user's open connections and are never forwarded to the browser.
 */
export class ServerSentEventsService {
  /**
   * Why this object is needed?
   *
   * A control message is addressed to a user, not a socket.
   * It arrives on sse:events:user:{userId}, and handleControlMessage gets only the userId.
   * It then has to find this user's sockets that are still loading (that are still subscribing to topics).
   */
  private readonly pendingControlMessagesByUserId = new Map<string, Map<string, SseControlMessage[]>>();

  constructor(
    private readonly logger: LoggerService,
    private readonly sseConnectionsService: SseConnectionsService,
    private readonly sseChannelSubscriberService: SseChannelSubscriberService,
    private readonly sseTopicsService: SseTopicsService,
  ) {}

  /**
   * Call when a connection of the user opens on this node.
   * @returns true once this node receives the user's messages, false if subscribing failed.
   */
  async subscribeToUserEvents(props: SubscribeToUserEventsProps): Promise<boolean> {
    const { userId, socketId } = props;

    const userEventsChannel = getUserEventsChannel(userId);

    const isSubscribed = await this.sseChannelSubscriberService.subscribe({
      channelName: userEventsChannel,
      socketId,
      listener: (payload) => this.handleUserChannelMessage({ userId, payload }),
    });

    return isSubscribed;
  }

  async subscribeToUserTopics(props: SubscribeToUserTopicsProps): Promise<string[] | null> {
    const { userId, socketId } = props;

    // Step 1: Start holding control messages for the socket.
    this.startHoldingControlMessages({ userId, socketId });

    // Step 2: Read the user's topics from Redis.
    const topics = await this.readUserTopics(userId);

    // Step 3: If the user has no topics, stop holding control messages and return null.
    if (!topics) {
      this.stopHoldingControlMessages({ userId, socketId });

      return null;
    }

    // Step 4: redis subscribe to each topic.
    const isTopicSubscribedResults = await Promise.all(
      topics.map((topic) => this.subscribeToTopicEvents({ socketId, topic })),
    );

    // Step 5: If all topics are subscribed, return the topics.
    const isEveryTopicSubscribed = isTopicSubscribedResults.every(Boolean);

    if (isEveryTopicSubscribed) return topics;

    // Step 6: If not all topics are subscribed, stop holding control messages and return null.
    this.stopHoldingControlMessages({ userId, socketId });

    return null;
  }

  /**
   * Releases every channel the socketId holds (its user's channel and its topics' channels),
   * whatever happened to it before. Idempotent. Call when the connection closes, or fails to open.
   */
  async releaseConnectionSubscriptions(socketId: string): Promise<void> {
    await this.sseChannelSubscriberService.unsubscribeSocketId(socketId);
  }

  /**
   * Call right after registering the connection, with no `await` in between, or when dropping it before registering.
   * Applies the topic changes held since {@link subscribeToUserTopics} to the connection, in the order they arrived.
   */
  completeTopicsLoad(props: CompleteTopicsLoadProps): void {
    const { socketId } = props;

    const controlMessages = this.stopHoldingControlMessages(props);

    controlMessages.forEach((controlMessage) => {
      this.applyControlMessage({ socketId, controlMessage });
    });
  }

  /**
   * Call on shutdown, before closing connections, so no new messages arrive while they are being closed.
   */
  async cleanup(): Promise<void> {
    await this.sseChannelSubscriberService.unsubscribeAll();
  }

  private handleUserChannelMessage(props: HandleUserChannelMessageProps): void {
    const { userId, payload } = props;

    // Step 1: Drop an oversized payload before parsing it.
    if (this.isOversizedPayload(payload)) return;

    // Step 2: Parse the payload.
    const parsedPayload = parseJson<unknown>(payload);

    // Step 3: If the payload is a control message, handle it.
    if (isControlMessage(parsedPayload)) {
      return void this.handleControlMessage({ userId, controlMessage: parsedPayload });
    }

    // Step 4: If the payload isn't a valid envelope either, drop it.
    if (!this.isValidEnvelope(parsedPayload)) {
      return void this.logger.error('SSE pub/sub: invalid envelope received', { payload });
    }

    // Step 5: Forward the envelope to the user's connections.
    const message = this.envelopeToSseMessage(parsedPayload);

    this.sseConnectionsService.sendToUser({ userId, message });
  }

  private forwardEnvelopeToTopic(props: ForwardEnvelopeToTopicProps): void {
    const { topic, payload } = props;

    if (this.isOversizedPayload(payload)) return;

    const parsedPayload = parseJson<unknown>(payload);

    if (!this.isValidEnvelope(parsedPayload)) {
      return void this.logger.error('SSE pub/sub: invalid envelope received', { payload });
    }

    const message = this.envelopeToSseMessage(parsedPayload);

    this.sseConnectionsService.sendToTopic({ topic, message });
  }

  /**
   * Applies the change to every open connection of the user on this node,
   * and holds it for the user's connections whose topics are still loading.
   */
  private handleControlMessage(props: HandleControlMessageProps): void {
    const { userId, controlMessage } = props;

    // Step 1: Get pendingControlMessagesBySocketId by userId.
    const pendingControlMessagesBySocketId = this.pendingControlMessagesByUserId.get(userId);

    // Step 2: Add the control message to all user sockets that are still loading.
    if (pendingControlMessagesBySocketId) {
      pendingControlMessagesBySocketId.forEach((pendingControlMessages) => {
        pendingControlMessages.push(controlMessage);
      });
    }

    // Step 3: Get userSocketIds.
    const userSocketIds = this.sseConnectionsService.getSocketIdsByUserId().get(userId);

    // Step 4: Apply the control message to all user sockets that are still loading.
    if (userSocketIds) {
      userSocketIds.forEach((socketId) => {
        this.applyControlMessage({ socketId, controlMessage });
      });
    }
  }

  /**
   * A no-op if the connection isn't registered, or is already in that state (e.g. the change was also in the topics it read).
   * Never rejects (failures are logged): callers don't await it, and an unhandled rejection would crash the process.
   */
  private async applyControlMessage(props: ApplyControlMessageProps): Promise<void> {
    const { socketId, controlMessage } = props;

    try {
      // Case 1: the user's session ended
      if (controlMessage.control === SseControlTypes.SessionEnded) {
        this.sseConnectionsService.closeConnection({ socketId, reason: SseCloseReasons.SessionEnded });

        return;
      }

      const { control, props: topicControlMessageProps } = controlMessage;
      const { topic } = topicControlMessageProps;

      // Case 2: join topic
      if (control === SseControlTypes.TopicJoined) {
        await this.joinTopic({ socketId, topic });

        return;
      }

      // Case 3: leave topic
      await this.leaveTopic({ socketId, topic });
    } catch (error) {
      this.logger.error('Failed to apply SSE control message', { socketId, controlMessage, error });
    }
  }

  /**
   * @description
   * Joins a socketId to a topic.
   *
   * Does nothing when:
   *
   * 1. a connection that isn't registered (it was dropped)
   * 2. socketId is already in the topic.
   */
  private async joinTopic(props: JoinTopicProps): Promise<void> {
    const { socketId, topic } = props;

    // Step 1: Add the topic to the connection.
    const isAdded = this.sseConnectionsService.addTopic({ socketId, topic });

    // Step 2: If the topic is not added, return.
    if (!isAdded) return;

    // Step 3: Subscribe to the topic events.
    const isSubscribed = await this.subscribeToTopicEvents({ socketId, topic });

    // Step 4: If the topic is not subscribed, remove the topic from the connection.
    if (isSubscribed) return;

    // Step 5: If the topic is subscribed, check if the connection is still holding the channel.
    // Stop routing the topic to the connection, unless a later join made it hold the channel again.
    const topicEventsChannel = getTopicEventsChannel(topic);

    const isHolding = this.sseChannelSubscriberService.isSocketSubscribed({
      socketId,
      channelName: topicEventsChannel,
    });

    if (!isHolding) {
      this.sseConnectionsService.removeTopic({ socketId, topic });
    }
  }

  /**
   * Both steps are idempotent, so this is safe whatever state the connection is in.
   */
  private async leaveTopic(props: LeaveTopicProps): Promise<void> {
    const { socketId, topic } = props;

    this.sseConnectionsService.removeTopic({ socketId, topic });

    const topicEventsChannel = getTopicEventsChannel(topic);

    await this.sseChannelSubscriberService.unsubscribe({ channelName: topicEventsChannel, socketId });
  }

  private startHoldingControlMessages(props: StartHoldingControlMessagesProps): void {
    const { userId, socketId } = props;

    let pendingControlMessagesBySocketId = this.pendingControlMessagesByUserId.get(userId);

    if (!pendingControlMessagesBySocketId) {
      pendingControlMessagesBySocketId = new Map<string, SseControlMessage[]>();
      this.pendingControlMessagesByUserId.set(userId, pendingControlMessagesBySocketId);
    }

    pendingControlMessagesBySocketId.set(socketId, []);
  }

  /**
   * @returns The control messages held for the connection.
   */
  private stopHoldingControlMessages(props: StopHoldingControlMessagesProps): SseControlMessage[] {
    const { userId, socketId } = props;

    // Step 1: Get all the socketIds of a user, each holding an array of pending control messages.
    const pendingControlMessagesBySocketId = this.pendingControlMessagesByUserId.get(userId);

    // Step 2: Extract the pending control messages themselves.
    const pendingControlMessages = pendingControlMessagesBySocketId?.get(socketId) ?? [];

    // Step 3: Delete the socketId from the map.
    pendingControlMessagesBySocketId?.delete(socketId);

    // Step 4: Delete the user from the map if no more socketIds are holding control messages.
    if (pendingControlMessagesBySocketId?.size === 0) {
      this.pendingControlMessagesByUserId.delete(userId);
    }

    // Step 5: Return the pending control messages.
    return pendingControlMessages;
  }

  /**
   * @returns The user's topics, or null (logged) if Redis failed.
   */
  private async readUserTopics(userId: string): Promise<string[] | null> {
    try {
      const topics = await this.sseTopicsService.getUserTopics(userId);

      return topics;
    } catch (error) {
      this.logger.error('Failed to read SSE user topics', { userId, error });

      return null;
    }
  }

  private async subscribeToTopicEvents(props: SubscribeToTopicEventsProps): Promise<boolean> {
    const { socketId, topic } = props;

    const topicEventsChannel = getTopicEventsChannel(topic);

    const isSubscribed = await this.sseChannelSubscriberService.subscribe({
      channelName: topicEventsChannel,
      socketId,
      listener: (payload) => this.forwardEnvelopeToTopic({ topic, payload }),
    });

    return isSubscribed;
  }

  private envelopeToSseMessage(envelope: SseEnvelope): string {
    const { event, data } = envelope;

    const dataStringified = JSON.stringify(data);
    const message = formatSseMessage({ event, data: dataStringified });

    return message;
  }

  private isValidEnvelope(envelope: unknown): envelope is SseEnvelope {
    if (!isObject(envelope)) return false;

    const { event } = envelope;

    return typeof event === 'string' && event.length > 0 && 'data' in envelope;
  }

  /**
   * The publisher already enforces {@link SSE_MAX_ENVELOPE_BYTES}; this guards against anything else publishing on the channels.
   */
  private isOversizedPayload(payload: string): boolean {
    const payloadBytes = Buffer.byteLength(payload);

    if (payloadBytes <= SSE_MAX_ENVELOPE_BYTES) return false;

    this.logger.error('SSE pub/sub: oversized envelope dropped', { payloadBytes });

    return true;
  }
}
