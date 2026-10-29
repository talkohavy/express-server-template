import { getUserEventsChannel } from '@src/core/services/sse-publisher';
import { ADD_USER_TO_TOPIC_LIMIT_REACHED, SSE_MAX_TOPICS_PER_USER, SseControlTypes } from './logic/constants';
import { ADD_USER_TO_TOPIC_SCRIPT, REMOVE_USER_FROM_TOPIC_SCRIPT } from './logic/lua-scripts';
import { getUserTopicsKey } from './logic/utils';
import type { RedisClientType } from 'redis';
import type { SseSessionEndedControlMessage, SseTopicControlMessage, UserTopicProps } from './types';

/**
 * Records which topics each user is in, so SSE events sent to a topic reach its users.
 * Call it from the service that owns the membership (e.g. the chats service, when a participant joins or leaves a chat).
 * That service's database stays the source of truth; Redis holds a copy for delivery.
 *
 * Kept per user (`sse:user:{userId}:topics`), so a new connection, after a refresh or a reconnect, picks up its topics.
 * A change also reaches the user's open connections right away, through a control message on the user's events channel.
 * Each operation touches one key, so it works on Redis Cluster too.
 * The keys have no TTL: a user stays in a topic until removed, whether online or not.
 *
 * Also owns the other control message on the user's channel: ending the user's SSE session (see {@link closeUserConnections}).
 */
export class SseTopicsService {
  constructor(private readonly redisPubClient: RedisClientType) {}

  /**
   * @description
   * `addUserToTopic` generates an `sseControlMessage` variable,
   * and passes it to the Redis script for execution.
   *
   * But what does "Control" here mean?
   *
   * It means instructions to the SSE server nodes, not content for the browser.
   * The word comes from networking, which splits traffic into two kinds:
   *
   * - Data messages: the payload being delivered. In our case that's an event like { event: 'new-message', data: {...} }.
   * - Control messages: telling the delivery system how to behave. They're never delivered to anyone.
   *
   * For example, { control: 'topic-joined', props: { topic: 'chat:7' } } tells the node:
   *
   * > "this user is now in chat:7; start routing that topic to their open connections."
   *
   * So it means **control over routing** on the node: which topics each open connection receives,
   * and which Redis topic channels the node subscribes to.
   *
   * Why it's needed?
   *
   * when an internal service calls addUserToTopic, the Lua script adds the topic to the user's set in Redis.
   * That covers future connections, which read the set when they connect. But the user may already have open
   * tabs on other server nodes, and those nodes read the set only at connect time. So the same script also
   * publishes this message on the user's channel (sse:events:user:{userId}), which those nodes are already
   * subscribed to. When a node receives it, handleUserChannelMessage recognizes the control field and routes
   * it to handleControlMessage instead of sendToUser. Then joinTopic or leaveTopic updates the connection's
   * topics and the Redis subscription. The browser never sees it.
   *
   * The messages stay in order relative to each other, due to both message kinds traveling on the same user channel.
   *
   * @returns `true` if the user was added (and the control message was published), `false` if they were already in the topic.
   * @throws if the user is already in {@link SSE_MAX_TOPICS_PER_USER} topics.
   */
  async addUserToTopic(props: UserTopicProps): Promise<boolean> {
    const { userId, topic } = props;

    const userTopicsKey = getUserTopicsKey(userId);
    const userEventsChannel = getUserEventsChannel(userId);
    const sseControlMessage: SseTopicControlMessage = {
      control: SseControlTypes.TopicJoined,
      props: { topic },
    };
    const sseControlMessageStringified = JSON.stringify(sseControlMessage);

    const command = [
      'EVAL',
      ADD_USER_TO_TOPIC_SCRIPT,
      '1',
      userTopicsKey,
      topic,
      userEventsChannel,
      sseControlMessageStringified,
      String(SSE_MAX_TOPICS_PER_USER),
    ];

    const result = await this.redisPubClient.sendCommand(command);

    const resultAsNumber = Number(result);

    if (resultAsNumber === ADD_USER_TO_TOPIC_LIMIT_REACHED) {
      throw new Error(`User ${userId} reached the limit of ${SSE_MAX_TOPICS_PER_USER} SSE topics`);
    }

    const isAdded = resultAsNumber === 1;

    return isAdded;
  }

  /**
   * The mirror of {@link addUserToTopic}: publishes a `topic-left` control message, so the user's open connections
   * stop receiving the topic.
   *
   * @returns `true` if the user was removed (and the control message was published), `false` if they weren't in the topic.
   */
  async removeUserFromTopic(props: UserTopicProps): Promise<boolean> {
    const { userId, topic } = props;

    const userTopicsKey = getUserTopicsKey(userId);
    const userEventsChannel = getUserEventsChannel(userId);
    const sseControlMessage: SseTopicControlMessage = {
      control: SseControlTypes.TopicLeft,
      props: { topic },
    };
    const sseControlMessageStringified = JSON.stringify(sseControlMessage);

    const command = [
      'EVAL',
      REMOVE_USER_FROM_TOPIC_SCRIPT,
      '1',
      userTopicsKey,
      topic,
      userEventsChannel,
      sseControlMessageStringified,
    ];

    const result = await this.redisPubClient.sendCommand(command);

    const isRemoved = Number(result) === 1;

    return isRemoved;
  }

  async getUserTopics(userId: string): Promise<string[]> {
    const userTopicsKey = getUserTopicsKey(userId);

    const userTopics = await this.redisPubClient.sMembers(userTopicsKey);

    return userTopics;
  }

  /**
   * Call when the user's session ends (e.g. on logout). Every node closes the user's open SSE connections,
   * including ones still opening. The user's topics are kept.
   *
   * Closes every device of the user, not just the one that logged out: the others reconnect on their own,
   * with their still-valid cookies, while the logged-out browser gets a 401 and stops.
   */
  async closeUserConnections(userId: string): Promise<void> {
    const userEventsChannel = getUserEventsChannel(userId);
    const sseControlMessage: SseSessionEndedControlMessage = {
      control: SseControlTypes.SessionEnded,
    };
    const sseControlMessageStringified = JSON.stringify(sseControlMessage);

    await this.redisPubClient.publish(userEventsChannel, sseControlMessageStringified);
  }
}
