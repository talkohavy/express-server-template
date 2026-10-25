import {
  SSE_CONNECTION_LEASE_TTL_MS,
  SSE_HEARTBEAT_INTERVAL_MS,
  SSE_MAX_CONNECTIONS_PER_USER,
} from '../../logic/constants';
import { ACQUIRE_LEASE_SCRIPT, REFRESH_LEASES_SCRIPT } from './logic/lua-scripts';
import { SseConnectionLimiterService } from './sse-connection-limiter.service';
import type { RedisClientType } from 'redis';
import type { LoggerService } from '@src/core/services/logger';
import type { SseConnectionsService } from '../sse-connections';

describe('SseConnectionLimiterService', () => {
  let service: SseConnectionLimiterService;
  let logger: { error: jest.Mock };
  let redisClient: { sendCommand: jest.Mock; zRem: jest.Mock };
  let socketIdsByUserId: Map<string, Set<string>>;

  beforeEach(() => {
    logger = { error: jest.fn() };
    redisClient = { sendCommand: jest.fn(), zRem: jest.fn() };
    socketIdsByUserId = new Map();

    const sseConnectionsService = {
      getSocketIdsByUserId: jest.fn(() => socketIdsByUserId),
    };

    service = new SseConnectionLimiterService(
      logger as unknown as LoggerService,
      sseConnectionsService as unknown as SseConnectionsService,
      redisClient as unknown as RedisClientType,
    );
  });

  describe('acquire', () => {
    it('should run the acquire script for the user key', async () => {
      redisClient.sendCommand.mockResolvedValue(1);

      const expectedResult = [
        'EVAL',
        ACQUIRE_LEASE_SCRIPT,
        '1',
        'sse:user:user-1:connections',
        'connection-1',
        String(SSE_CONNECTION_LEASE_TTL_MS),
        String(SSE_MAX_CONNECTIONS_PER_USER),
      ];

      await service.acquire({ userId: 'user-1', socketId: 'connection-1' });

      const [actualResult] = redisClient.sendCommand.mock.calls[0];

      expect(actualResult).toEqual(expectedResult);
    });

    it('should allow the connection when the script acquires a lease', async () => {
      redisClient.sendCommand.mockResolvedValue(1);

      const actualResult = await service.acquire({ userId: 'user-1', socketId: 'connection-1' });

      expect(actualResult).toBe(true);
    });

    it('should reject the connection when the user is at the limit', async () => {
      redisClient.sendCommand.mockResolvedValue(0);

      const actualResult = await service.acquire({ userId: 'user-1', socketId: 'connection-1' });

      expect(actualResult).toBe(false);
    });

    it('should reject the connection and log when Redis fails', async () => {
      redisClient.sendCommand.mockRejectedValue(new Error('connection lost'));

      const actualResult = await service.acquire({ userId: 'user-1', socketId: 'connection-1' });

      expect(actualResult).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('release', () => {
    it('should remove the lease from the user key', async () => {
      await service.release({ userId: 'user-1', socketId: 'connection-1' });

      expect(redisClient.zRem).toHaveBeenCalledWith('sse:user:user-1:connections', 'connection-1');
    });

    it('should log instead of throwing when Redis fails', async () => {
      redisClient.zRem.mockRejectedValue(new Error('connection lost'));

      await expect(service.release({ userId: 'user-1', socketId: 'connection-1' })).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('lease refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      service.stop();
      jest.useRealTimers();
    });

    it('should refresh the leases of every local user once per heartbeat interval', async () => {
      socketIdsByUserId.set('user-1', new Set(['connection-1', 'connection-2']));
      socketIdsByUserId.set('user-2', new Set(['connection-3']));

      const expectedResult = [
        [
          'EVAL',
          REFRESH_LEASES_SCRIPT,
          '1',
          'sse:user:user-1:connections',
          String(SSE_CONNECTION_LEASE_TTL_MS),
          'connection-1',
          'connection-2',
        ],
        [
          'EVAL',
          REFRESH_LEASES_SCRIPT,
          '1',
          'sse:user:user-2:connections',
          String(SSE_CONNECTION_LEASE_TTL_MS),
          'connection-3',
        ],
      ];

      service.start();
      await jest.advanceTimersByTimeAsync(SSE_HEARTBEAT_INTERVAL_MS);

      const actualResult = redisClient.sendCommand.mock.calls.map(([command]) => command);

      expect(actualResult).toEqual(expectedResult);
    });

    it('should not refresh after stop', async () => {
      service.start();
      service.stop();

      const actualResult = jest.getTimerCount();

      expect(actualResult).toBe(0);
    });
  });
});
