import { getUserTopicsKey } from './logic/utils';
import type { RedisClientType } from 'redis';
import type { UserTopicProps } from './types';

/**
 * Records which topics each user is in, so SSE events sent to a topic reach its users.
 * Call it from the service that owns the membership (e.g. the chats service, when a participant joins or leaves a chat).
 * That service's database stays the source of truth; Redis holds a copy for delivery.
 *
 * Kept per user (`sse:user:{userId}:topics`), so a new connection, after a refresh or a reconnect, picks up its topics.
 * Each operation touches one key, so it works on Redis Cluster too.
 * The keys have no TTL: a user stays in a topic until removed, whether online or not.
 */
export class SseTopicsService {
  constructor(private readonly redisPubClient: RedisClientType) {}

  /**
   * @returns `true` if the user was added, `false` if they were already in the topic.
   */
  async addUserToTopic(props: UserTopicProps): Promise<boolean> {
    const { userId, topic } = props;

    const userTopicsKey = getUserTopicsKey(userId);

    const addedCount = await this.redisPubClient.sAdd(userTopicsKey, topic);

    return addedCount === 1;
  }

  /**
   * @returns true if the user was removed, false if they weren't in the topic.
   */
  async removeUserFromTopic(props: UserTopicProps): Promise<boolean> {
    const { userId, topic } = props;

    const userTopicsKey = getUserTopicsKey(userId);

    // Redis deletes the key when its last topic is removed.
    const removedCount = await this.redisPubClient.sRem(userTopicsKey, topic);

    return removedCount === 1;
  }

  async getUserTopics(userId: string): Promise<string[]> {
    const userTopicsKey = getUserTopicsKey(userId);

    const userTopics = await this.redisPubClient.sMembers(userTopicsKey);

    return userTopics;
  }
}
