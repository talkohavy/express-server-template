import {
  SSE_CONNECTION_LEASE_TTL_MS,
  SSE_HEARTBEAT_INTERVAL_MS,
  SSE_MAX_CONNECTIONS_PER_USER,
} from '../../logic/constants';
import { ACQUIRE_LEASE_SCRIPT, REFRESH_LEASES_SCRIPT } from './logic/lua-scripts';
import type { RedisClientType } from 'redis';
import type { LoggerService } from '@src/core/services/logger';
import type { SseConnectionsService } from '../sse-connections';
import type { ExecuteScriptProps, LeaseProps, UserLeasesProps } from './types';

/**
 * Enforces {@link SSE_MAX_CONNECTIONS_PER_USER} across the whole cluster, not just this node.
 *
 * Every connection holds a lease in Redis (a ZSET member per user, scored by expiry).
 * - acquire: before the stream opens. Atomic check-and-add in Lua.
 * - release: when the connection closes, and all at once on shutdown.
 * - refresh: every heartbeat interval, for all of this node's connections.
 *
 * There is no reaper: a crashed node's leases are pruned lazily on the next acquire for that user,
 * and the whole key expires on its own once nothing refreshes it.
 */
export class SseConnectionLimiterService {
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly logger: LoggerService,
    private readonly sseConnectionsService: SseConnectionsService,
    private readonly redisClient: RedisClientType,
  ) {}

  /**
   * @returns true if the user may open another connection.
   */
  async acquire(props: LeaseProps): Promise<boolean> {
    const { userId, socketId } = props;

    const userConnectionsKey = this.getSseUserConnectionsKey(userId);

    try {
      const result = await this.executeScript({
        script: ACQUIRE_LEASE_SCRIPT,
        keys: [userConnectionsKey],
        args: [socketId, String(SSE_CONNECTION_LEASE_TTL_MS), String(SSE_MAX_CONNECTIONS_PER_USER)],
      });

      return result === 1;
    } catch (error) {
      this.logger.error('Failed to acquire SSE connection lease, rejecting the connection', {
        userId,
        socketId,
        error,
      });

      return false;
    }
  }

  async release(props: LeaseProps): Promise<void> {
    const { userId, socketId } = props;

    await this.releaseUserLeases({ userId, socketIds: [socketId] });
  }

  /**
   * Call on shutdown, before closing the connections (it reads them).
   * Each connection also releases its lease when it closes, but the process may exit before those finish,
   * and the leases left behind would count against their users for up to {@link SSE_CONNECTION_LEASE_TTL_MS},
   * right when they reconnect to another node.
   */
  async releaseAll(): Promise<void> {
    const socketIdsByUserId = this.sseConnectionsService.getSocketIdsByUserId();

    const releasePromises: Promise<void>[] = [];

    socketIdsByUserId.forEach((socketIds, userId) => {
      const releasePromise = this.releaseUserLeases({ userId, socketIds: [...socketIds] });

      releasePromises.push(releasePromise);
    });

    await Promise.all(releasePromises);
  }

  start(): void {
    if (this.refreshInterval) return;

    this.refreshInterval = setInterval(() => this.refreshAllLeases(), SSE_HEARTBEAT_INTERVAL_MS);

    this.refreshInterval.unref();
  }

  stop(): void {
    if (!this.refreshInterval) return;

    clearInterval(this.refreshInterval);

    this.refreshInterval = null;
  }

  private async refreshAllLeases(): Promise<void> {
    const socketIdsByUserId = this.sseConnectionsService.getSocketIdsByUserId();

    const refreshPromises: Promise<void>[] = [];

    socketIdsByUserId.forEach((socketIds, userId) => {
      const refreshPromise = this.refreshUserLeases({ userId, socketIds: [...socketIds] });

      refreshPromises.push(refreshPromise);
    });

    await Promise.all(refreshPromises);
  }

  private async refreshUserLeases(props: UserLeasesProps): Promise<void> {
    const { userId, socketIds } = props;

    const userConnectionsKey = this.getSseUserConnectionsKey(userId);

    try {
      await this.executeScript({
        script: REFRESH_LEASES_SCRIPT,
        keys: [userConnectionsKey],
        args: [String(SSE_CONNECTION_LEASE_TTL_MS), ...socketIds],
      });
    } catch (error) {
      this.logger.error('Failed to refresh SSE connection leases', { userId, error });
    }
  }

  private async releaseUserLeases(props: UserLeasesProps): Promise<void> {
    const { userId, socketIds } = props;

    const userConnectionsKey = this.getSseUserConnectionsKey(userId);

    try {
      await this.redisClient.zRem(userConnectionsKey, socketIds);
    } catch (error) {
      // Not fatal: the leases expire on their own after SSE_CONNECTION_LEASE_TTL_MS.
      this.logger.error('Failed to release SSE connection leases', { userId, socketIds, error });
    }
  }

  private getSseUserConnectionsKey(userId: string): string {
    return `sse:user:${userId}:connections`;
  }

  private async executeScript(props: ExecuteScriptProps): Promise<number> {
    const { script, keys, args } = props;

    const command = ['EVAL', script, String(keys.length), ...keys, ...args];

    const result = await this.redisClient.sendCommand(command);

    return Number(result);
  }
}
