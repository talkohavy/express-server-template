import { isObject } from '@src/common/utils/isObject';
import { parseJson } from '@src/common/utils/parseJson';
import { getUserEventsChannel, SSE_EVENTS_CHANNEL } from '@src/core/services/sse-publisher';
import { SSE_SIMULATION_INTERVAL_MS } from '../../logic/constants';
import { formatSseMessage } from '../../logic/utils/format-sse-message';
import type { RedisClientType } from 'redis';
import type { LoggerService } from '@src/core/services/logger';
import type { SseEnvelope, SsePublisherService } from '@src/core/services/sse-publisher';
import type { SseChannelSubscriberService } from '../sse-channel-subscriber';
import type { SseConnectionsService } from '../sse-connections';
import type { ForwardEnvelopeToUserProps } from './types';

/**
 * Bridges Redis pub/sub and this node's SSE connections (the receiving side; publishing is SsePublisherService).
 * - Broadcast: every node subscribes to the same channel, so a message published from any node reaches every client.
 * - Per user: a node subscribes to a user's channel only while it holds a connection of that user.
 */
export class ServerSentEventsService {
  private simulationInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly logger: LoggerService,
    private readonly sseConnectionsService: SseConnectionsService,
    private readonly sseChannelSubscriberService: SseChannelSubscriberService,
    private readonly ssePublisherService: SsePublisherService,
    private readonly redisSubClient: RedisClientType,
  ) {}

  async subscribeToEvents(): Promise<void> {
    await this.redisSubClient.subscribe(SSE_EVENTS_CHANNEL, this.forwardEnvelopeToAllConnections.bind(this));

    this.logger.info(`Subscribed to Redis pub/sub channel: ${SSE_EVENTS_CHANNEL}`);
  }

  /**
   * Call when a connection of the user opens on this node. Reference-counted per user.
   * @returns true once this node receives the user's messages, false if subscribing failed.
   */
  async subscribeToUserEvents(userId: string): Promise<boolean> {
    const userEventsChannel = getUserEventsChannel(userId);

    const isSubscribed = await this.sseChannelSubscriberService.subscribe({
      channel: userEventsChannel,
      listener: (payload) => this.forwardEnvelopeToUser({ userId, payload }),
    });

    return isSubscribed;
  }

  /**
   * Call when a connection of the user closes on this node.
   */
  async unsubscribeFromUserEvents(userId: string): Promise<void> {
    const channel = getUserEventsChannel(userId);

    await this.sseChannelSubscriberService.unsubscribe(channel);
  }

  /**
   * Call on shutdown, before closing connections, so no new messages arrive while they are being closed.
   */
  async cleanup(): Promise<void> {
    this.stopSimulation();

    await this.redisSubClient.unsubscribe(SSE_EVENTS_CHANNEL);

    this.logger.info(`Unsubscribed from Redis pub/sub channel: ${SSE_EVENTS_CHANNEL}`);

    await this.sseChannelSubscriberService.unsubscribeAll();
  }

  /**
   * Dev-only helper: broadcasts the current time every second.
   */
  startSimulation(): void {
    if (this.simulationInterval) return;

    this.simulationInterval = setInterval(async () => {
      try {
        await this.ssePublisherService.broadcast({ data: { time: new Date().toISOString() } });
      } catch (error) {
        this.logger.error('SSE simulation failed to broadcast', { error });
      }
    }, SSE_SIMULATION_INTERVAL_MS);
  }

  stopSimulation(): void {
    if (!this.simulationInterval) return;

    clearInterval(this.simulationInterval);

    this.simulationInterval = null;
  }

  private forwardEnvelopeToAllConnections(payload: string): void {
    const message = this.envelopeToSseMessage(payload);

    if (!message) return;

    this.sseConnectionsService.sendToAll(message);
  }

  private forwardEnvelopeToUser(props: ForwardEnvelopeToUserProps): void {
    const { userId, payload } = props;

    const message = this.envelopeToSseMessage(payload);

    if (!message) return;

    this.sseConnectionsService.sendToUser({ userId, message });
  }

  /**
   * @returns The formatted SSE message, or null (logged) if the payload isn't a valid envelope.
   */
  private envelopeToSseMessage(payload: string): string | null {
    const envelope = parseJson<SseEnvelope>(payload);

    if (!this.isValidEnvelope(envelope)) {
      this.logger.error('SSE pub/sub: invalid envelope received', { payload });

      return null;
    }

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
}
