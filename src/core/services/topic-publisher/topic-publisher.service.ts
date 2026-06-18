import type { RedisClientType } from 'redis';
import type { TopicPayload } from '@src/common/types';

/**
 * Publishes messages to topics via Redis pub/sub.
 * Every node (including this one) receives published messages and forwards them
 * to its local WebSocket clients subscribed to that topic.
 */
export class TopicPublisherService {
  /**
   * @param redis Redis client for publishing (non-subscriber mode).
   */
  constructor(
    private readonly redis: RedisClientType,
    private readonly channelName: string,
  ) {}

  /**
   * Publishes a message to a topic via Redis pub/sub. Every node (including this one) receives it
   * and forwards to its local WebSocket clients subscribed to the topic.
   * @returns The number of Redis subscriber nodes that received the message.
   */
  async publishToTopic(topicPayload: TopicPayload): Promise<number> {
    const payloadStringified = JSON.stringify(topicPayload);

    const subscriberCount = await this.redis.publish(this.channelName, payloadStringified);

    return subscriberCount;
  }
}
