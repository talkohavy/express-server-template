import type { RedisClientType } from 'redis';
import type { LoggerService } from '@src/core/services/logger';
import type { ChannelSubscription, ChannelSubscriptionProps, SubscribeToChannelProps } from './types';

/**
 * Reference-counted Redis pub/sub subscriptions.
 *
 * Many local connections can need the same channel (e.g. one user with several tabs), but Redis must be
 * subscribed only once per node: SUBSCRIBE on the first subscriber, UNSUBSCRIBE when the last one leaves.
 *
 * Why not rely on node-redis for this: it stores listeners in a Set, so subscribing the same listener twice
 * keeps one, and the first unsubscribe would drop the channel for everyone.
 *
 * Commands are pipelined in order on the subscriber connection, so a fast
 * unsubscribe -> subscribe (a user closing their last tab and reopening it) always ends up subscribed.
 */
export class SseChannelSubscriberService {
  private readonly subscriptions = new Map<string, ChannelSubscription>();

  constructor(
    private readonly logger: LoggerService,
    private readonly redisSubClient: RedisClientType,
  ) {}

  /**
   * @returns true once Redis confirmed the subscription, false if it failed.
   */
  async subscribe(props: SubscribeToChannelProps): Promise<boolean> {
    const { channel } = props;

    const subscription = this.subscriptions.get(channel) ?? this.createSubscription(props);

    subscription.subscribersCount += 1;

    try {
      await subscription.pendingSubscription;

      return true;
    } catch (error) {
      this.logger.error('Failed to subscribe to SSE channel', { channel, error });

      this.dropFailedSubscriber({ channel, subscription });

      return false;
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    const subscription = this.subscriptions.get(channel);

    if (!subscription) return;

    if (subscription.subscribersCount > 1) {
      subscription.subscribersCount -= 1;

      return;
    }

    this.subscriptions.delete(channel);

    try {
      await this.redisSubClient.unsubscribe(channel, subscription.listener);
    } catch (error) {
      // Not fatal: messages on a channel with no local subscribers are just dropped.
      this.logger.error('Failed to unsubscribe from SSE channel', { channel, error });
    }
  }

  /**
   * Call on shutdown, so no more messages are fanned out while connections are being closed.
   * Unsubscribes only the channels it subscribed, since the Redis subscriber client is shared with other modules.
   */
  async unsubscribeAll(): Promise<void> {
    const channels = Array.from(this.subscriptions.keys());

    this.subscriptions.clear();

    if (channels.length === 0) return;

    await this.redisSubClient.unsubscribe(channels);

    this.logger.info('Unsubscribed from SSE channels', { channelsCount: channels.length });
  }

  getChannelsCount(): number {
    return this.subscriptions.size;
  }

  private createSubscription(props: SubscribeToChannelProps): ChannelSubscription {
    const { channel, listener } = props;

    const subscription: ChannelSubscription = {
      subscribersCount: 0,
      listener,
      pendingSubscription: null,
    };

    this.subscriptions.set(channel, subscription);

    subscription.pendingSubscription = this.subscribeToRedis({ channel, subscription });

    return subscription;
  }

  /**
   * Works on the given subscription object, not on whatever the map holds for the channel when it settles:
   * by then the channel may have been unsubscribed and subscribed again, which creates a new object.
   */
  private async subscribeToRedis(props: ChannelSubscriptionProps): Promise<void> {
    const { channel, subscription } = props;

    try {
      await this.redisSubClient.subscribe(channel, subscription.listener);
    } finally {
      subscription.pendingSubscription = null;
    }
  }

  private dropFailedSubscriber(props: ChannelSubscriptionProps): void {
    const { channel, subscription } = props;

    subscription.subscribersCount -= 1;

    const isCurrentSubscription = this.subscriptions.get(channel) === subscription;

    if (isCurrentSubscription && subscription.subscribersCount <= 0) {
      this.subscriptions.delete(channel);
    }
  }
}
