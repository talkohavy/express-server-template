import {
  SSE_DRAIN_TIMEOUT_MS,
  SSE_HEARTBEAT_INTERVAL_MS,
  SSE_MAX_BUFFERED_BYTES,
  SSE_SHUTDOWN_FLUSH_TIMEOUT_MS,
  SSE_SHUTDOWN_RETRY_JITTER_MS,
  SSE_SHUTDOWN_RETRY_MIN_MS,
  SseCloseReasons,
} from '../../logic/constants';
import { formatSseMessage } from '../../logic/utils/format-sse-message';
import type { LoggerService } from '@src/core/services/logger';
import type { SseConnection } from '../../types';
import type {
  AddTopicProps,
  AddToTopicIndexProps,
  AddToTopicsIndexProps,
  AddToUserIndexProps,
  CloseConnectionProps,
  DestroyConnectionProps,
  RegisterConnectionProps,
  RemoveFromTopicsIndexProps,
  RemoveFromUserIndexProps,
  RemoveTopicProps,
  SendToConnectionProps,
  SendToTopicProps,
  SendToUserProps,
  WriteProps,
} from './types';

const HEARTBEAT_MESSAGE = formatSseMessage({ comment: 'ping' });

/**
 * Registry of the SSE connections held by this node (in memory only).
 * Writes pre-serialized messages to connections; it knows nothing about Redis.
 *
 * Also owns connection health:
 * - a single heartbeat timer (not one per connection), running only while there are connections
 * - closing connections whose access token expired, on that same heartbeat
 * - destroying slow clients, so one stalled reader can't grow this node's memory without limit
 * - closing every connection on shutdown with a jittered `retry:`
 */
export class SseConnectionsService {
  private readonly connectionsBySocketId = new Map<string, SseConnection>();
  /**
   * Turned off once shutdown starts; never turned back on.
   */
  private isAccepting = true;
  /**
   * A user can hold several connections at once (one per open tab or device).
   * Only users with at least one connection on this node have an entry.
   * Good for quickly sending a message to all connections a user has on this node.
   */
  private readonly socketIdsByUserId = new Map<string, Set<string>>();
  /**
   * Only topics with at least one connection on this node have an entry.
   * Good for quickly sending a message to all connections in a topic on this node.
   */
  private readonly socketIdsByTopic = new Map<string, Set<string>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private readonly logger: LoggerService) {}

  register(props: RegisterConnectionProps): SseConnection {
    const { socketId, userId, sessionId, response, expiresAt, topics = [] } = props;

    const socketConnection: SseConnection = {
      socketId,
      userId,
      sessionId,
      response,
      expiresAt,
      topics: new Set(topics),
      drainTimeout: null,
    };

    this.connectionsBySocketId.set(socketId, socketConnection);
    this.addToUserIndex(socketConnection);
    this.addToTopicsIndex(socketConnection);

    this.startHeartbeat();

    this.logger.debug('SSE connection registered', {
      socketId,
      userId,
      connectionsCount: this.connectionsBySocketId.size,
    });

    return socketConnection;
  }

  /**
   * @description
   *
   * What it does?
   *
   * 1. Clears the drain timeout
   * 2. Deletes the connection from connectionsBySocketId
   * 3. Removes the connection from the user index
   * 4. Removes the connection from the topics index
   * 5. Stops the heartbeat if there are no connections left
   */
  unregister(socketId: string): void {
    const connection = this.connectionsBySocketId.get(socketId);

    if (!connection) return;

    this.clearDrainTimeout(connection);

    this.connectionsBySocketId.delete(socketId);
    this.removeFromUserIndex(connection);
    this.removeFromTopicsIndex(connection);

    if (this.connectionsBySocketId.size === 0) {
      this.stopHeartbeat();
    }

    this.logger.debug('SSE connection unregistered', { socketId, connectionsCount: this.connectionsBySocketId.size });
  }

  /**
   * Gracefully closes an open connection: unregisters it right away, and ends its response with a jittered `retry:`,
   * so the client reconnects (and is authenticated again).
   * A back-pressured connection is destroyed instead, since its final message might never flush.
   * A no-op if the connection is unknown.
   */
  closeConnection(props: CloseConnectionProps): void {
    const { socketId, reason } = props;

    // Step 1: Get the connection by socket id
    const socketConnection = this.connectionsBySocketId.get(socketId);

    // Step 2: If the connection is not found, do nothing
    if (!socketConnection) return;

    // Step 3: If the connection is back-pressured, destroy it (which also unregisters it)
    // back-pressured = server not able to write to the client (i.e. client is slow)
    if (socketConnection.drainTimeout) return this.destroy({ connection: socketConnection, reason });

    this.logger.info('Closing SSE connection', { socketId, reason });

    // Step 4: Unregister the connection
    this.unregister(socketId);

    // Step 5: End the connection with a jittered `retry:`
    this.endWithRetry(socketConnection);
  }

  /**
   * Adds a topic to an open socket's connection.
   * @returns `true` if added, `false` if the socket is unknown or already in the topic.
   */
  addTopic(props: AddTopicProps): boolean {
    const { socketId, topic } = props;

    const connection = this.connectionsBySocketId.get(socketId);

    if (!connection || connection.topics.has(topic)) return false;

    connection.topics.add(topic);
    this.addToTopicIndex({ socketId, topic });

    return true;
  }

  /**
   * Removes a topic from an open socket's connection.
   * @returns `true` if removed, `false` if the socket is unknown or not in the topic.
   */
  removeTopic(props: RemoveTopicProps): boolean {
    const { socketId, topic } = props;

    const socketConnection = this.connectionsBySocketId.get(socketId);

    if (!socketConnection?.topics.has(topic)) return false;

    socketConnection.topics.delete(topic);
    this.removeFromTopicIndex({ socketId, topic });

    return true;
  }

  /**
   * @returns `true` if the message was written, `false` if the connection is unknown, closed, or was just destroyed for being too slow.
   */
  send(props: SendToConnectionProps): boolean {
    const { socketId, message } = props;

    const socketConnection = this.connectionsBySocketId.get(socketId);

    if (!socketConnection) return false;

    const isWritten = this.write({ connection: socketConnection, message });

    return isWritten;
  }

  /**
   * Writes to every connection of the user on this node.
   * A no-op if the user has none here.
   */
  sendToUser(props: SendToUserProps): void {
    const { userId, message } = props;

    const userSocketIds = this.socketIdsByUserId.get(userId);

    userSocketIds?.forEach((socketId) => {
      this.send({ socketId, message });
    });
  }

  /**
   * Writes to every connection in the topic on this node.
   * A no-op if the topic has none here.
   */
  sendToTopic(props: SendToTopicProps): void {
    const { topic, message } = props;

    const topicSocketIds = this.socketIdsByTopic.get(topic);

    topicSocketIds?.forEach((socketId) => {
      this.send({ socketId, message });
    });
  }

  sendToAll(message: string): void {
    this.connectionsBySocketId.forEach((connection) => {
      this.write({ connection, message });
    });
  }

  getConnection(socketId: string): SseConnection | undefined {
    return this.connectionsBySocketId.get(socketId);
  }

  getConnectionsCount(): number {
    return this.connectionsBySocketId.size;
  }

  /**
   * Counts this node's connections only.
   * The same user may hold more connections on other nodes.
   */
  getUserConnectionsCount(userId: string): number {
    const userSocketIds = this.socketIdsByUserId.get(userId);

    return userSocketIds?.size ?? 0;
  }

  getSocketIdsByUserId(): ReadonlyMap<string, ReadonlySet<string>> {
    return this.socketIdsByUserId;
  }

  isAcceptingConnections(): boolean {
    return this.isAccepting;
  }

  /**
   * Call first thing on shutdown, so connections that are still opening are refused instead of registered
   * after every connection was closed.
   */
  stopAcceptingConnections(): void {
    this.isAccepting = false;
  }

  /**
   * Call on shutdown. Stops the heartbeat, tells every client to reconnect after a random delay,
   * and ends every response. Resolves once all final messages are flushed, or after a timeout,
   * at which point the connections that haven't flushed are destroyed.
   */
  async closeAllConnections(): Promise<void> {
    this.stopAcceptingConnections();
    this.stopHeartbeat();

    const allConnectionsArr = Array.from(this.connectionsBySocketId.values());

    this.connectionsBySocketId.clear();
    this.socketIdsByUserId.clear();
    this.socketIdsByTopic.clear();

    const allConnectionsEndedPromise = Promise.all(
      allConnectionsArr.map((connection) => this.endWithRetry(connection)),
    );

    let flushTimeout: NodeJS.Timeout | undefined;
    const flushTimeoutPromise = new Promise<void>((resolve) => {
      flushTimeout = setTimeout(resolve, SSE_SHUTDOWN_FLUSH_TIMEOUT_MS);
    });

    await Promise.race([allConnectionsEndedPromise, flushTimeoutPromise]);

    clearTimeout(flushTimeout);

    /**
     * Destroys the sockets of responses that still haven't flushed their final message by the timeout
     * (slow clients, or dead TCP peers nobody noticed). Their buffered data is dropped, and the client
     * reconnects with its last known `retry`.
     *
     * Without it, a stuck socket stays open, and since `server.close()` waits for open connections,
     * the process can't exit until the orchestrator kills it, cutting the rest of the shutdown short.
     */
    allConnectionsArr.forEach((connection) => {
      if (!connection.response.writableFinished) connection.response.destroy();
    });

    this.logger.info('Closed all SSE connections', {
      connectionsCount: allConnectionsArr.length,
      reason: SseCloseReasons.Shutdown,
    });
  }

  /**
   * ## **Slow client**
   *
   * With SSE, the server keeps an HTTP response open and keeps writing messages to it:
   * heartbeat pings, and events for that user or their topics. Usually the client reads them right away.
   * A **slow client** is one that can't keep up. It might be on a bad mobile network,
   * sitting in a frozen browser tab, or behind a stalled proxy.
   * The server keeps sending, but the data isn't getting through.
   *
   *
   * ## **Backpressure**
   *
   * When you call response.write(message), Node doesn't send the bytes over the network immediately.
   * It puts them in an in-memory buffer for that connection, and the operating system sends them out
   * as the client accepts them.
   *
   * If the client is slow, that buffer keeps growing. Backpressure is the stream telling you,
   * "the client isn't keeping up, stop sending for now." Node signals it in two ways:
   *
   * 1. response.write() returns false instead of true. That means the buffer is above a threshold (about 16KB by default). The data is still queued, not lost.
   * 2. response.writableLength tells you how many bytes are waiting in that buffer.
   *
   * So there are two ways to drop a client:
   * 1. by size (the buffer passed 1MB)
   * 2. or by time (it stayed backed up for 30 seconds).
   *
   * The time check catches clients that are stuck but receive too little traffic to ever reach 1MB.
   */
  private write(props: WriteProps): boolean {
    const { connection, message } = props;
    const { socketId, response } = connection;

    // Step 1: if the connection is ended or destroyed, do nothing
    if (response.writableEnded || response.destroyed) return false;

    /**
     * Step 2: Hard limit. if more than 1MB (SSE_MAX_BUFFERED_BYTES) is already waiting for this client,
     * the server drops the connection right away. This close reason is "slow-client".
     */
    if (response.writableLength > SSE_MAX_BUFFERED_BYTES) {
      this.destroy({ connection, reason: SseCloseReasons.SlowClient });

      return false;
    }

    try {
      /**
       * Step 3: Soft signal. if write() returns false, the server starts a timer to see whether the client recovers.
       * That's what watchDrain does.
       */
      const isFlushed = response.write(message);

      if (!isFlushed) this.watchDrain(connection);

      return true;
    } catch (error) {
      this.logger.error('Failed to write SSE message', { socketId, error });

      return false;
    }
  }

  /**
   * Gives a back-pressured connection {@link SSE_DRAIN_TIMEOUT_MS} to drain before destroying it.
   *
   * When the buffer empties out again, Node emits a "drain" event on the stream,
   * meaning "caught up, you can write again".
   * `watchDrain` uses that event to give the client a grace period. How:
   *
   * 1. It starts a timer.
   * 2. If `drain` fires before the timer runs out, the client caught up, so the timer is cancelled and nothing happens.
   * 3. If 30 seconds pass with no `drain`, the client is treated as stuck and the connection is destroyed. This close reason is "drain-timeout".
   * 4. The early return means each connection has at most one timer, no matter how many writes are backed up.
   */
  private watchDrain(connection: SseConnection): void {
    // Step 1: if a drain timeout is already set, do nothing
    if (connection.drainTimeout) return;

    // Step 2: set a drain timeout
    connection.drainTimeout = setTimeout(() => {
      this.destroy({ connection, reason: SseCloseReasons.DrainTimeout });
    }, SSE_DRAIN_TIMEOUT_MS);

    /**
     * Step 3: listen for the drain event
     * When the client has drained the buffer, the drain event is emitted.
     * We clear the drain timeout to stop the backpressure.
     */
    connection.response.once('drain', () => this.clearDrainTimeout(connection));
  }

  private clearDrainTimeout(connection: SseConnection): void {
    if (!connection.drainTimeout) return;

    clearTimeout(connection.drainTimeout);

    connection.drainTimeout = null;
  }

  private destroy(props: DestroyConnectionProps): void {
    const { connection, reason } = props;
    const { socketId, response } = connection;

    this.logger.warn('Destroying SSE connection', {
      socketId,
      reason,
      bufferedBytes: response.writableLength,
    });

    this.unregister(socketId);

    response.destroy();
  }

  private async endWithRetry(connection: SseConnection): Promise<void> {
    const { socketId, response } = connection;

    // Step 1: Clear the drain timeout
    this.clearDrainTimeout(connection);

    // Step 2: If the connection is ended or destroyed, do nothing
    if (response.writableEnded || response.destroyed) return;

    // Step 3: Generate a random retry delay
    const retry = SSE_SHUTDOWN_RETRY_MIN_MS + Math.floor(Math.random() * SSE_SHUTDOWN_RETRY_JITTER_MS);
    const retryMessage = formatSseMessage({ retry });

    try {
      // Step 4: End the connection with a jittered `retry:`
      await new Promise<void>((resolve) => {
        response.end(retryMessage, resolve);
      });
    } catch (error) {
      this.logger.error('Failed to end SSE connection', { socketId, error });
    }
  }

  private addToUserIndex(props: AddToUserIndexProps): void {
    const { userId, socketId } = props;

    const userSocketIds = this.socketIdsByUserId.get(userId) ?? new Set<string>();

    userSocketIds.add(socketId);

    this.socketIdsByUserId.set(userId, userSocketIds);
  }

  private removeFromUserIndex(props: RemoveFromUserIndexProps): void {
    const { userId, socketId } = props;

    const userSocketIds = this.socketIdsByUserId.get(userId);

    if (!userSocketIds) return;

    userSocketIds.delete(socketId);

    // Drop empty sets, so the index doesn't keep an entry for every user that has ever connected.
    if (userSocketIds.size === 0) {
      this.socketIdsByUserId.delete(userId);
    }
  }

  private addToTopicsIndex(props: AddToTopicsIndexProps): void {
    const { topics, socketId } = props;

    topics.forEach((topic) => this.addToTopicIndex({ topic, socketId }));
  }

  private removeFromTopicsIndex(props: SseConnection): void {
    const { topics, socketId } = props;

    topics.forEach((topic) => this.removeFromTopicIndex({ socketId, topic }));
  }

  private addToTopicIndex(props: AddToTopicIndexProps): void {
    const { topic, socketId } = props;

    const topicSocketIds = this.socketIdsByTopic.get(topic) ?? new Set<string>();

    topicSocketIds.add(socketId);

    this.socketIdsByTopic.set(topic, topicSocketIds);
  }

  private removeFromTopicIndex(props: RemoveFromTopicsIndexProps): void {
    const { socketId, topic } = props;

    const topicSocketIds = this.socketIdsByTopic.get(topic);

    if (!topicSocketIds) return;

    topicSocketIds.delete(socketId);

    if (topicSocketIds.size === 0) {
      this.socketIdsByTopic.delete(topic);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), SSE_HEARTBEAT_INTERVAL_MS);

    // An interval keeps the process alive by default. A heartbeat interval shouldn't. We need to unref it to avoid that.
    this.heartbeatInterval.unref();
  }

  /**
   * Pings every connection, and closes the ones whose access token expired instead.
   * Checking expiry here costs no extra timer, at the price of closing up to one interval late.
   */
  private sendHeartbeat(): void {
    const now = Date.now();

    this.connectionsBySocketId.forEach((connection) => {
      const { socketId, expiresAt } = connection;

      if (expiresAt <= now) {
        return void this.closeConnection({ socketId, reason: SseCloseReasons.TokenExpired });
      }

      this.write({ connection, message: HEARTBEAT_MESSAGE });
    });
  }

  private stopHeartbeat(): void {
    if (!this.heartbeatInterval) return;

    clearInterval(this.heartbeatInterval);

    this.heartbeatInterval = null;
  }
}
