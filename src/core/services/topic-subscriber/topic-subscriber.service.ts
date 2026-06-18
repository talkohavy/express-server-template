import { WebSocket as WS } from 'ws';
import { parseJson } from '@src/common/utils/parseJson';
import { DEFAULT_TOPIC_KEY_TTL_SECONDS } from './logic/constants';
import {
  CLEANUP_CONNECTIONS_SCRIPT,
  SUBSCRIBE_SCRIPT,
  UNSUBSCRIBE_ALL_SCRIPT,
  UNSUBSCRIBE_SCRIPT,
} from './logic/redis-topic-scripts.lua';
import { getSocketsUnderTopicKey, getTopicsGroupKey, getTopicsUnderSocketKey } from './logic/utils';
import type { RedisClientType } from 'redis';
import type { WebSocket } from 'ws';
import type { TopicPayload } from '@src/common/types';
import type { LoggerService } from '@src/core/services/logger';
import type { InterceptorFunc, RegisterInterceptorProps } from './types';

/**
 * Manages topic subscriptions for WebSocket clients with Redis as the source of truth.
 * Horizontally scalable: each node only holds its local client connections in memory;
 * subscription state lives in Redis and all mutations are atomic via Lua scripts.
 *
 * Responsibilities:
 * - Subscribe/unsubscribe clients to topics
 * - Query subscription state (client topics, topic subscribers, counts)
 * - Maintain local socketId -> WebSocket mapping for message forwarding
 * - Listen to Redis pub/sub channel and forward messages to local subscribers
 * - Apply topic-specific interceptors for message transformation
 * - Cleanup Redis keys on client disconnect or server shutdown
 *
 * In-memory only:
 * - socketId -> WebSocket (so this node can send to its local clients)
 *
 * Redis: Uses two Redis clients:
 * 1. Non-subscriber client (for EVAL, SADD, SMEMBERS, PUBLISH, etc.)
 * 2. Subscriber client (dedicated for SUBSCRIBE/UNSUBSCRIBE to pub/sub channel)
 */
export class TopicSubscriberService {
  /**
   * Local connections only: socketId -> WebSocket for this node.
   */
  private readonly socketIdToSocket = new Map<string, WebSocket>();

  /**
   * Topic-specific message interceptors. Registered via {@link register} before pub/sub starts.
   */
  private readonly topicInterceptors: Record<string, InterceptorFunc> = {};

  /**
   * @param redis Non-subscriber Redis client (for EVAL, sets, PUBLISH, etc.).
   * @param redisSub Subscriber Redis client (dedicated for SUBSCRIBE to pub/sub channel).
   * @param logger Logger service for debugging and error tracking.
   */
  constructor(
    private readonly redis: RedisClientType,
    private readonly redisSub: RedisClientType,
    private readonly logger: LoggerService,
    private readonly channelName: string,
  ) {}

  /**
   * Register a topic-specific interceptor that transforms or filters messages before they are sent to clients.
   * Return `null` from the interceptor to skip delivery for that client.
   */
  register(props: RegisterInterceptorProps): void {
    const { topic, interceptor } = props;

    this.topicInterceptors[topic] = interceptor;
  }

  /**
   * Start listening on the Redis pub/sub channel. Call once on startup.
   * Messages published to this channel are forwarded to local WebSocket clients.
   */
  async subscribeToPubSub(): Promise<void> {
    await this.redisSub.subscribe(this.channelName, this.forwardMessageToSubscribers.bind(this));

    this.logger.info(`Subscribed to Redis pub/sub channel: ${this.channelName}`);
  }

  /**
   * Start listening on the Redis pub/sub channel. Call once on startup.
   * Messages published to this channel are forwarded to local WebSocket clients.
   */
  async unsubscribeFromPubSub(): Promise<void> {
    await this.redisSub.unsubscribe(this.channelName);

    this.logger.info(`Unsubscribed from Redis pub/sub channel: ${this.channelName}`);
  }

  /**
   * Subscribe a client to a topic. Registers the socket locally on first subscribe so getTopicSubscribers can resolve it.
   * @returns true if newly subscribed, false if already subscribed.
   */
  async subscribe(socket: WebSocket, topic: string): Promise<boolean> {
    const socketId = socket.id;

    if (!socketId) return false;

    this.socketIdToSocket.set(socketId, socket);

    const socketsUnderTopicKey = getSocketsUnderTopicKey(topic);
    const topicsUnderSocketKey = getTopicsUnderSocketKey(socketId);
    const topicsGroupKey = getTopicsGroupKey();
    const ttl = String(DEFAULT_TOPIC_KEY_TTL_SECONDS);

    const result = await this.executeScript(
      SUBSCRIBE_SCRIPT,
      3,
      [socketsUnderTopicKey, topicsUnderSocketKey, topicsGroupKey],
      [socketId, topic, ttl],
    );

    return result === 1;
  }

  /**
   * Unsubscribe a client from a topic.
   * @returns true if was subscribed and removed, false otherwise.
   */
  async unsubscribe(socket: WebSocket, topic: string): Promise<boolean> {
    const socketId = socket.id;

    if (!socketId) return false;

    const socketsUnderTopicKey = getSocketsUnderTopicKey(topic);
    const topicsUnderSocketKey = getTopicsUnderSocketKey(socketId);
    const topicsGroupKey = getTopicsGroupKey();
    const ttl = String(DEFAULT_TOPIC_KEY_TTL_SECONDS);

    const result = await this.executeScript(
      UNSUBSCRIBE_SCRIPT,
      3,
      [socketsUnderTopicKey, topicsUnderSocketKey, topicsGroupKey],
      [socketId, topic, ttl],
    );

    return result === 1;
  }

  /**
   * Unsubscribe a client from all topics (e.g. on disconnect).
   * Removes the client from local maps after clearing Redis.
   */
  async unsubscribeClientFromAllTopics(socket: WebSocket): Promise<void> {
    const socketId = socket.id;

    if (!socketId) return;

    const topicsUnderSocketKey = getTopicsUnderSocketKey(socketId);
    const topicsGroupKey = getTopicsGroupKey();
    const ttl = String(DEFAULT_TOPIC_KEY_TTL_SECONDS);

    await this.executeScript(UNSUBSCRIBE_ALL_SCRIPT, 2, [topicsUnderSocketKey, topicsGroupKey], [socketId, ttl]);

    this.socketIdToSocket.delete(socketId);
  }

  /**
   * Returns only the local WebSocket clients that are subscribed to the topic.
   * Other nodes have their own local subscribers; each node sends only to its own.
   */
  async getTopicSubscribers(topic: string): Promise<Set<WebSocket>> {
    const socketsUnderTopicKey = getSocketsUnderTopicKey(topic);

    const socketIds = await this.redis.sMembers(socketsUnderTopicKey);

    const subscribedSockets = new Set<WebSocket>();

    socketIds.forEach((id) => {
      const socket = this.socketIdToSocket.get(id);

      if (socket == null) return;

      subscribedSockets.add(socket);
    });

    return subscribedSockets;
  }

  /**
   * Topics this client is subscribed to (from Redis).
   */
  async getClientTopics(socket: WebSocket): Promise<Set<string>> {
    const socketId = socket.id;

    if (!socketId) return new Set<string>();

    const topicsUnderSocketKey = getTopicsUnderSocketKey(socketId);
    const topicsOfSocket = await this.redis.sMembers(topicsUnderSocketKey);

    return new Set(topicsOfSocket);
  }

  async isSubscribed(socket: WebSocket, topic: string): Promise<boolean> {
    const socketId = socket.id;

    if (!socketId) return false;

    const socketsUnderTopicKey = getSocketsUnderTopicKey(topic);

    const isSubscribedToTopic = await this.redis.sIsMember(socketsUnderTopicKey, socketId);

    return Boolean(isSubscribedToTopic);
  }

  /**
   * Total number of topics (across all nodes).
   */
  async getTopicCount(): Promise<number> {
    const topicsGroupKey = getTopicsGroupKey();

    const topicsCount = await this.redis.sCard(topicsGroupKey);

    return topicsCount;
  }

  /**
   * All topic names (across all nodes).
   */
  async getTopicNames(): Promise<string[]> {
    const topicsGroupKey = getTopicsGroupKey();

    const topicNames = await this.redis.sMembers(topicsGroupKey);

    return topicNames;
  }

  /**
   * Total subscriber count for a topic (across all nodes).
   */
  async getSubscriberCount(topic: string): Promise<number> {
    const socketsUnderTopicKey = getSocketsUnderTopicKey(topic);

    const subscribersCount = await this.redis.sCard(socketsUnderTopicKey);

    return subscribersCount;
  }

  /**
   * Remove all Redis keys for the given connection IDs (this node's connections).
   * Use on shutdown so this process's keys are removed from Redis.
   */
  async removeConnectionsFromRedis(socketIds: string[]): Promise<void> {
    if (socketIds.length === 0) return;

    const topicsGroupKey = getTopicsGroupKey();
    const keys = [topicsGroupKey, ...socketIds.map(getTopicsUnderSocketKey)];
    const ttl = String(DEFAULT_TOPIC_KEY_TTL_SECONDS);

    await this.executeScript(CLEANUP_CONNECTIONS_SCRIPT, keys.length, keys, [ttl, ...socketIds]);
  }

  /**
   * Remove from Redis all keys for connections that belong to this node (local connections).
   * Call on server shutdown so this process does not leave stale keys in Redis.
   */
  async removeAllLocalConnectionsFromRedis(): Promise<void> {
    const socketIds = Array.from(this.socketIdToSocket.keys());

    await this.removeConnectionsFromRedis(socketIds);
  }

  /**
   * Call on shutdown.
   * Stop listening to the Redis pub/sub channel,
   * and remove all local connections from Redis.
   */
  async cleanup(): Promise<void> {
    await this.unsubscribeFromPubSub();

    await this.removeAllLocalConnectionsFromRedis();

    this.logger.log('Unsubscribed from Redis pub/sub channel');
  }

  /**
   * Receives a message from Redis pub/sub, parses it, and forwards to local WebSocket clients
   * subscribed to that topic. Applies topic-specific interceptors if configured.
   *
   * **IMPORTANT NOTES**
   *
   * - The sent payload is essentially payloadAsString, unless an interceptor is applied.
   * - We do NOT strip the topic wrapper from the payload! Make sure your interceptors don't strip it either.
   *
   * Why not strip the topic wrapper?
   *
   * The receiving client needs to know the topic in order to classify the message.
   * If you strip the topic wrapper, the receiving client won't know the context of the message.
   */
  private async forwardMessageToSubscribers(payloadAsString: string): Promise<void> {
    const parsedPayload = parseJson<TopicPayload>(payloadAsString);

    if (!this.isValidTopicMessage(parsedPayload)) {
      this.logger.error('WS topic pub/sub: invalid JSON/data received on channel', this.channelName);

      return;
    }

    const { topic } = parsedPayload;

    const topicSubscribers = await this.getTopicSubscribers(topic);

    for (const socket of topicSubscribers) {
      if (socket.readyState !== WS.OPEN) continue;

      const interceptor = this.topicInterceptors[topic];

      const updatedPayload = interceptor ? await interceptor(parsedPayload) : parsedPayload;

      if (updatedPayload === null) continue;

      try {
        const serialized = JSON.stringify(updatedPayload);
        socket.send(serialized, { binary: false });
      } catch (error) {
        this.logger.error(`Failed to send topic message to client in topic "${topic}"`, { error });
      }
    }
  }

  /**
   * Validates that the parsed payload is a valid TopicPayload.
   */
  private isValidTopicMessage(topicPayload: TopicPayload | null): topicPayload is TopicPayload {
    if (!topicPayload) return false;

    const { data } = topicPayload;

    return typeof data === 'object' && data !== null;
  }

  /**
   * Run a Lua script via EVAL. Uses sendCommand for EVAL so we don't depend on scriptLoad.
   */
  private async executeScript(script: string, numKeys: number, keys: string[], args: string[]): Promise<number> {
    const cmd = ['EVAL', script, String(numKeys), ...keys, ...args];

    const result = await this.redis.sendCommand(cmd);

    if (typeof result === 'number') return result;

    if (typeof result === 'string') return Number(result);

    return 0;
  }
}
