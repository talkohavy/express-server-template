import { SSE_DEFAULT_EVENT_NAME, SSE_EVENTS_CHANNEL } from './logic/constants';
import { getUserEventsChannel } from './logic/utils';
import type { RedisClientType } from 'redis';
import type { BroadcastProps, PublishProps, SendToUserProps, SseEnvelope } from './types';

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
   * Sends to every open SSE connection on every node.
   * @returns The number of nodes that received it.
   */
  async broadcast(props: BroadcastProps): Promise<number> {
    const { event = SSE_DEFAULT_EVENT_NAME, data } = props;

    const receivingNodesCount = await this.publish({ channel: SSE_EVENTS_CHANNEL, event, data });

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
