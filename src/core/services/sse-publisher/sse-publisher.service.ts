import { SSE_DEFAULT_EVENT_NAME } from './logic/constants';
import { getTopicEventsChannel, getUserEventsChannel } from './logic/utils';
import type { RedisClientType } from 'redis';
import type { PublishProps, SendToTopicProps, SendToUserProps, SseEnvelope } from './types';

/**
 * Publishes SSE events through Redis pub/sub.
 * Works from any node or micro-service that has Redis, whether or not it holds SSE connections itself;
 * the nodes that do hold the recipients' connections deliver them.
 *
 * Delivery is live-only (at-most-once): a user with no open SSE connection doesn't get the event, and it isn't stored.
 */
export class SsePublisherService {
  constructor(private readonly redisPubClient: RedisClientType) {}

  /**
   * Sends to every open SSE connection of the user (every tab and device), on any node.
   * @returns The number of nodes that received it. 0 means the user has no open SSE connection anywhere.
   */
  async sendToUser(props: SendToUserProps): Promise<number> {
    const { userId, event = SSE_DEFAULT_EVENT_NAME, data } = props;

    const userEventsChannel = getUserEventsChannel(userId);

    const receivingNodesCount = await this.publish({ channel: userEventsChannel, event, data });

    return receivingNodesCount;
  }

  /**
   * Sends to every open SSE connection in the topic, on any node.
   * Users get into a topic through `SseTopicsService` (`app.sseTopics`).
   * @returns The number of nodes that received it. 0 means no one in the topic has an open SSE connection.
   */
  async sendToTopic(props: SendToTopicProps): Promise<number> {
    const { topic, event = SSE_DEFAULT_EVENT_NAME, data } = props;

    const topicEventsChannel = getTopicEventsChannel(topic);

    const receivingNodesCount = await this.publish({ channel: topicEventsChannel, event, data });

    return receivingNodesCount;
  }

  private async publish(props: PublishProps): Promise<number> {
    const { channel, event, data } = props;

    const envelope: SseEnvelope = { event, data };
    const envelopeStringified = JSON.stringify(envelope);

    const receivingNodesCount = await this.redisPubClient.publish(channel, envelopeStringified);

    return receivingNodesCount;
  }
}
