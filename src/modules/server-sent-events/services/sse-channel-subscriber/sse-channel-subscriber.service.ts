import type { RedisClientType } from 'redis';
import type { LoggerService } from '@src/core/services/logger';
import type {
  AddToSocketIndexProps,
  ChannelSubscription,
  SubscribeToRedisProps,
  CreateChannelProps,
  DropFailedSocketIdProps,
  RemoveFromSocketIndexProps,
  SubscribeProps,
  UnsubscribeProps,
  IsSocketSubscribedProps,
} from './types';

/**
 * Shared Redis pub/sub subscriptions, tracked per holder (a connection's socketId).
 *
 * Many local connections can need the same channel (e.g. one user with several tabs), but Redis must be
 * subscribed only once per node: SUBSCRIBE when the first holder arrives, UNSUBSCRIBE when the last one leaves.
 *
 * This service is the single source of truth for what each connection holds:
 * - Every operation is idempotent per holder: subscribing twice holds once, releasing twice releases once.
 * - {@link unsubscribeHolder} releases everything a connection holds, so a closing connection can't leak a channel
 *   or release one it doesn't hold, whatever happened before (failures, concurrent joins and leaves).
 *
 * Why not rely on node-redis for this: it stores listeners in a Set, so subscribing the same listener twice
 * keeps one, and the first unsubscribe would drop the channel for everyone.
 *
 * Commands are pipelined in order on the subscriber connection, so a fast
 * unsubscribe -> subscribe (a user closing their last tab and reopening it) always ends up subscribed.
 */
export class SseChannelSubscriberService {
  private readonly channelsByName = new Map<string, ChannelSubscription>();
  /**
   * holderId -> the channels it holds.
   * Only holders with at least one channel have an entry.
   * Good for quickly removing all channels a socketId holds.
   */
  private readonly channelsBySocketId = new Map<string, Set<string>>();

  constructor(
    private readonly logger: LoggerService,
    private readonly redisSubClient: RedisClientType,
  ) {}

  /**
   * @description
   *
   * Subscribes a socketId to a channel.
   * If the channel doesn't exist, it is created.
   * When a channel is first created, it is being subscribed to redis in the background.
   *
   * A `channel` could for example be:
   * - a topic events channel (`sse:events:topic:{topic}`),
   * - a user events channel (`sse:events:user:{userId}`).
   *
   * @returns true once Redis confirmed the subscription, false if it failed (the holder then holds nothing for it).
   */
  async subscribe(props: SubscribeProps): Promise<boolean> {
    const { socketId, channelName } = props;

    // Step 1: If the channel is already exists, use it, otherwise create a new one.
    // Also, subscribe to redis in the background.
    const channel = this.channelsByName.get(channelName) ?? this.createChannel(props);

    // Step 2: Add the socketId to the channel index.
    channel.socketIds.add(socketId);

    // Step 3: Add the channel to the socketId index.
    this.addToSocketIndex({ socketId, channelName });

    try {
      // Step 4: Wait for the redis subscription to be confirmed.
      await channel.pendingSubscription;

      // Step 5: Return true if the subscription was successful.
      return true;
    } catch (error) {
      this.logger.error('Failed to subscribe to SSE channel', { channelName, error });

      this.dropFailedSocketId({ channelName, socketId, channel });

      return false;
    }
  }

  /**
   * A no-op if the holder doesn't hold the channel.
   */
  async unsubscribe(props: UnsubscribeProps): Promise<void> {
    const { channelName, socketId } = props;

    // Step 1: Get the channel by name.
    const channel = this.channelsByName.get(channelName);

    // Step 2: If the socketId is not in the channel, return.
    if (!channel?.socketIds.has(socketId)) return;

    // Step 3: Remove the socketId from the channel index.
    channel.socketIds.delete(socketId);

    // Step 4: Remove the channel from the socketId index.
    this.removeFromSocketIndex({ socketId, channelName });

    // Step 5: If the channel is still held by other socketIds, return.
    if (channel.socketIds.size > 0) return;

    // Step 6: Remove the channel from the channelsByName index.
    this.channelsByName.delete(channelName);

    try {
      // Step 7: Unsubscribe from the channel.
      await this.redisSubClient.unsubscribe(channelName, channel.listener);
    } catch (error) {
      // Not fatal: messages on a channel with no local subscribers are just dropped.
      this.logger.error('Failed to unsubscribe from SSE channel', { channelName, error });
    }
  }

  /**
   * Releases every channel the holder holds. Call when its connection closes.
   */
  async unsubscribeSocketId(socketId: string): Promise<void> {
    const holderChannels = Array.from(this.channelsBySocketId.get(socketId) ?? []);

    await Promise.all(holderChannels.map((channelName) => this.unsubscribe({ channelName, socketId })));
  }

  /**
   * Call on shutdown, so no more messages are fanned out while connections are being closed.
   * Unsubscribes only the channels it subscribed, since the Redis subscriber client is shared with other modules.
   */
  async unsubscribeAll(): Promise<void> {
    const channels = Array.from(this.channelsByName.keys());

    this.channelsByName.clear();
    this.channelsBySocketId.clear();

    if (channels.length === 0) return;

    await this.redisSubClient.unsubscribe(channels);

    this.logger.info('Unsubscribed from SSE channels', { channelsCount: channels.length });
  }

  /**
   * @returns true if the socketId holds the channel, confirmed by Redis or still in flight.
   */
  isSocketSubscribed(props: IsSocketSubscribedProps): boolean {
    const { socketId, channelName } = props;

    const isHolding = this.channelsByName.get(channelName)?.socketIds.has(socketId) ?? false;

    return isHolding;
  }

  getChannelsCount(): number {
    return this.channelsByName.size;
  }

  /**
   * @description
   * Creates a new channel and subscribes (with redis) to it.
   *
   * The redis subscribe is done in the background, so the channel object is returned immediately.
   * The promise is resolved when the subscription is confirmed by Redis.
   * The promise is rejected if the redis subscription fails.
   */
  private createChannel(props: CreateChannelProps): ChannelSubscription {
    const { channelName, listener } = props;

    // Step 1: Create the channel.
    const channel: ChannelSubscription = {
      socketIds: new Set<string>(),
      listener,
      pendingSubscription: null,
    };

    // Step 2: Add the channel to the channelsByName index.
    this.channelsByName.set(channelName, channel);

    // Step 3: Subscribe to the channel (to redis events, and attach a listener).
    channel.pendingSubscription = this.subscribeToRedis({ channelName, listener }).finally(() => {
      channel.pendingSubscription = null;
    });

    // Step 4: Return the channel object.
    return channel;
  }

  private async subscribeToRedis(props: SubscribeToRedisProps): Promise<void> {
    const { channelName, listener } = props;

    try {
      await this.redisSubClient.subscribe(channelName, listener);
    } catch (error) {
      if (this.channelsByName.get(channelName)?.listener === listener) {
        this.channelsByName.delete(channelName);
      }

      throw error;
    }
  }

  /**
   * The failed subscription is already out of the map. The holder keeps the channel in its index only if it also
   * holds it through a newer subscription (it subscribed again after the failed one was dropped).
   */
  private dropFailedSocketId(props: DropFailedSocketIdProps): void {
    const { channelName, socketId, channel } = props;

    channel.socketIds.delete(socketId);

    const isHeldThroughCurrentSubscription = this.isSocketSubscribed({ socketId, channelName });

    if (!isHeldThroughCurrentSubscription) {
      this.removeFromSocketIndex({ channelName, socketId });
    }
  }

  private addToSocketIndex(props: AddToSocketIndexProps): void {
    const { socketId, channelName } = props;

    let socketChannels = this.channelsBySocketId.get(socketId);

    if (!socketChannels) {
      socketChannels = new Set<string>();
      this.channelsBySocketId.set(socketId, socketChannels);
    }

    socketChannels.add(channelName);
  }

  private removeFromSocketIndex(props: RemoveFromSocketIndexProps): void {
    const { socketId, channelName } = props;

    const holderChannels = this.channelsBySocketId.get(socketId);

    if (!holderChannels) return;

    holderChannels.delete(channelName);

    if (holderChannels.size === 0) {
      this.channelsBySocketId.delete(socketId);
    }
  }
}
