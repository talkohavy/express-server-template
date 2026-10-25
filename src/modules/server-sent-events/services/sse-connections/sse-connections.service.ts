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
  DestroyConnectionProps,
  RegisterConnectionProps,
  SendToConnectionProps,
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
 * - destroying slow clients, so one stalled reader can't grow this node's memory without limit
 * - closing every connection on shutdown with a jittered `retry:`
 */
export class SseConnectionsService {
  private readonly connections = new Map<string, SseConnection>();
  /**
   * A user can hold several connections at once (one per open tab or device).
   * Only users with at least one connection on this node have an entry.
   */
  private readonly socketIdsByUserId = new Map<string, Set<string>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private readonly logger: LoggerService) {}

  register(props: RegisterConnectionProps): SseConnection {
    const { socketId, userId, response } = props;

    const connection: SseConnection = {
      socketId,
      userId,
      response,
      connectedAt: Date.now(),
      drainTimeout: null,
    };

    this.connections.set(socketId, connection);
    this.addToUserIndex(connection);

    this.startHeartbeat();

    this.logger.debug('SSE connection registered', {
      socketId,
      userId,
      connectionsCount: this.connections.size,
    });

    return connection;
  }

  unregister(socketId: string): void {
    const connection = this.connections.get(socketId);

    if (!connection) return;

    this.clearDrainTimeout(connection);

    this.connections.delete(socketId);
    this.removeFromUserIndex(connection);

    if (this.connections.size === 0) {
      this.stopHeartbeat();
    }

    this.logger.debug('SSE connection unregistered', { socketId, connectionsCount: this.connections.size });
  }

  /**
   * @returns true if the message was written, false if the connection is unknown, closed, or was just destroyed for being too slow.
   */
  send(props: SendToConnectionProps): boolean {
    const { socketId, message } = props;

    const connection = this.connections.get(socketId);

    if (!connection) return false;

    const isWritten = this.write({ connection, message });

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

  sendToAll(message: string): void {
    this.connections.forEach((connection) => {
      this.write({ connection, message });
    });
  }

  getConnectionsCount(): number {
    return this.connections.size;
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

  /**
   * Call on shutdown. Stops the heartbeat, tells every client to reconnect after a random delay,
   * and ends every response. Resolves once all final messages are flushed, or after a timeout.
   */
  async closeAllConnections(): Promise<void> {
    this.stopHeartbeat();

    const connectionsArr = Array.from(this.connections.values());

    this.connections.clear();
    this.socketIdsByUserId.clear();

    const allConnectionsEndedPromise = Promise.all(connectionsArr.map((connection) => this.endWithRetry(connection)));

    let flushTimeout: NodeJS.Timeout | undefined;
    const flushTimeoutPromise = new Promise<void>((resolve) => {
      flushTimeout = setTimeout(resolve, SSE_SHUTDOWN_FLUSH_TIMEOUT_MS);
    });

    await Promise.race([allConnectionsEndedPromise, flushTimeoutPromise]);

    clearTimeout(flushTimeout);

    this.logger.info('Closed all SSE connections', {
      connectionsCount: connectionsArr.length,
      reason: SseCloseReasons.Shutdown,
    });
  }

  /**
   * ## **Slow client**
   *
   * With SSE, the server keeps an HTTP response open and keeps writing messages to it:
   * heartbeat pings and broadcasts from sendToAll. Usually the client reads them right away.
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

    this.clearDrainTimeout(connection);

    if (response.writableEnded || response.destroyed) return;

    const retry = SSE_SHUTDOWN_RETRY_MIN_MS + Math.floor(Math.random() * SSE_SHUTDOWN_RETRY_JITTER_MS);
    const retryMessage = formatSseMessage({ retry });

    try {
      await new Promise<void>((resolve) => {
        response.end(retryMessage, () => resolve());
      });
    } catch (error) {
      this.logger.error('Failed to end SSE connection', { socketId, error });
    }
  }

  private addToUserIndex(connection: SseConnection): void {
    const { socketId, userId } = connection;

    const userSocketIds = this.socketIdsByUserId.get(userId) ?? new Set<string>();

    userSocketIds.add(socketId);

    this.socketIdsByUserId.set(userId, userSocketIds);
  }

  private removeFromUserIndex(connection: SseConnection): void {
    const { socketId, userId } = connection;

    const userSocketIds = this.socketIdsByUserId.get(userId);

    if (!userSocketIds) return;

    userSocketIds.delete(socketId);

    // Drop empty sets, so the index doesn't keep an entry for every user that has ever connected.
    if (userSocketIds.size === 0) {
      this.socketIdsByUserId.delete(userId);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => this.sendToAll(HEARTBEAT_MESSAGE), SSE_HEARTBEAT_INTERVAL_MS);

    // An interval keeps the process alive by default. A heartbeat interval shouldn't. We need to unref it to avoid that.
    this.heartbeatInterval.unref();
  }

  private stopHeartbeat(): void {
    if (!this.heartbeatInterval) return;

    clearInterval(this.heartbeatInterval);

    this.heartbeatInterval = null;
  }
}
