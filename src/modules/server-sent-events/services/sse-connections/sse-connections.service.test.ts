import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import {
  SSE_DRAIN_TIMEOUT_MS,
  SSE_HEARTBEAT_INTERVAL_MS,
  SSE_MAX_BUFFERED_BYTES,
  SSE_SHUTDOWN_FLUSH_TIMEOUT_MS,
  SSE_SHUTDOWN_RETRY_JITTER_MS,
  SSE_SHUTDOWN_RETRY_MIN_MS,
} from '../../logic/constants';
import { SseConnectionsService } from './sse-connections.service';
import type { Response } from 'express';
import type { LoggerService } from '@src/core/services/logger';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';

type ResponseMock = Response & {
  write: jest.Mock;
  end: jest.Mock;
  destroy: jest.Mock;
};

function createLoggerMock() {
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as LoggerService;

  return logger;
}

function createResponseMock(props?: { writableEnded?: boolean; writableLength?: number }) {
  const { writableEnded = false, writableLength = 0 } = props ?? {};

  const response = Object.assign(new EventEmitter(), {
    write: jest.fn().mockReturnValue(true),
    end: jest.fn((_chunk: string, callback: () => void) => callback()),
    destroy: jest.fn(),
    writableEnded,
    writableLength,
    destroyed: false,
  }) as unknown as ResponseMock;

  return response;
}

describe('SseConnectionsService', () => {
  let service: SseConnectionsService;

  beforeEach(() => {
    service = new SseConnectionsService(createLoggerMock());
  });

  describe('register', () => {
    it('should keep the id it was given', () => {
      const connection = service.register({
        socketId: 'connection-1',
        response: createResponseMock(),
        userId: USER_ID,
      });

      expect(connection.socketId).toBe('connection-1');
    });

    it('should increase the connections count', () => {
      service.register({ socketId: randomUUID(), response: createResponseMock(), userId: USER_ID });
      service.register({ socketId: randomUUID(), response: createResponseMock(), userId: USER_ID });

      const actualResult = service.getConnectionsCount();

      expect(actualResult).toBe(2);
    });
  });

  describe('unregister', () => {
    it('should remove only the given connection', () => {
      const first = service.register({ socketId: randomUUID(), response: createResponseMock(), userId: USER_ID });
      const secondResponse = createResponseMock();
      service.register({ socketId: randomUUID(), response: secondResponse, userId: USER_ID });

      service.unregister(first.socketId);
      service.sendToAll('data: x\n\n');

      expect(secondResponse.write).toHaveBeenCalledWith('data: x\n\n');
    });

    it('should be a no-op for an unknown connection id', () => {
      const response = createResponseMock();
      service.register({ socketId: randomUUID(), response, userId: USER_ID });

      service.unregister('unknown-id');

      const actualResult = service.getConnectionsCount();

      expect(actualResult).toBe(1);
    });
  });

  describe('getUserConnectionsCount', () => {
    it('should count connections per user', () => {
      service.register({ socketId: randomUUID(), response: createResponseMock(), userId: USER_ID });
      service.register({ socketId: randomUUID(), response: createResponseMock(), userId: USER_ID });
      service.register({ socketId: randomUUID(), response: createResponseMock(), userId: OTHER_USER_ID });

      const expectedResult = { [USER_ID]: 2, [OTHER_USER_ID]: 1 };

      const actualResult = {
        [USER_ID]: service.getUserConnectionsCount(USER_ID),
        [OTHER_USER_ID]: service.getUserConnectionsCount(OTHER_USER_ID),
      };

      expect(actualResult).toEqual(expectedResult);
    });

    it('should return 0 for a user with no connections', () => {
      const actualResult = service.getUserConnectionsCount('unknown-user');

      expect(actualResult).toBe(0);
    });

    it('should decrease when one of the user connections is unregistered', () => {
      const first = service.register({ socketId: randomUUID(), response: createResponseMock(), userId: USER_ID });
      service.register({ socketId: randomUUID(), response: createResponseMock(), userId: USER_ID });

      service.unregister(first.socketId);

      const actualResult = service.getUserConnectionsCount(USER_ID);

      expect(actualResult).toBe(1);
    });

    it('should drop the user once their last connection is destroyed as a slow client', () => {
      const response = createResponseMock({ writableLength: SSE_MAX_BUFFERED_BYTES + 1 });
      const connection = service.register({ socketId: randomUUID(), response, userId: USER_ID });

      service.send({ socketId: connection.socketId, message: 'data: x\n\n' });

      const actualResult = service.getUserConnectionsCount(USER_ID);

      expect(actualResult).toBe(0);
    });

    it('should drop every user on closeAllConnections', async () => {
      service.register({ socketId: randomUUID(), response: createResponseMock(), userId: USER_ID });
      service.register({ socketId: randomUUID(), response: createResponseMock(), userId: OTHER_USER_ID });

      await service.closeAllConnections();

      const expectedResult = [0, 0];

      const actualResult = [service.getUserConnectionsCount(USER_ID), service.getUserConnectionsCount(OTHER_USER_ID)];

      expect(actualResult).toEqual(expectedResult);
    });
  });

  describe('send', () => {
    it('should write the message to the given connection', () => {
      const response = createResponseMock();
      const connection = service.register({ socketId: randomUUID(), response, userId: USER_ID });

      const actualResult = service.send({ socketId: connection.socketId, message: 'data: x\n\n' });

      expect(actualResult).toBe(true);
      expect(response.write).toHaveBeenCalledWith('data: x\n\n');
    });

    it('should return false for an unknown connection id', () => {
      const actualResult = service.send({ socketId: 'unknown-id', message: 'data: x\n\n' });

      expect(actualResult).toBe(false);
    });

    it('should not write to a response that already ended', () => {
      const response = createResponseMock({ writableEnded: true });
      const connection = service.register({ socketId: randomUUID(), response, userId: USER_ID });

      const actualResult = service.send({ socketId: connection.socketId, message: 'data: x\n\n' });

      expect(actualResult).toBe(false);
      expect(response.write).not.toHaveBeenCalled();
    });
  });

  describe('sendToUser', () => {
    it("should write to every connection of the user and to no one else's", () => {
      const firstTab = createResponseMock();
      const secondTab = createResponseMock();
      const otherUserResponse = createResponseMock();
      service.register({ socketId: randomUUID(), response: firstTab, userId: USER_ID });
      service.register({ socketId: randomUUID(), response: secondTab, userId: USER_ID });
      service.register({ socketId: randomUUID(), response: otherUserResponse, userId: OTHER_USER_ID });

      service.sendToUser({ userId: USER_ID, message: 'data: x\n\n' });

      expect(firstTab.write).toHaveBeenCalledWith('data: x\n\n');
      expect(secondTab.write).toHaveBeenCalledWith('data: x\n\n');
      expect(otherUserResponse.write).not.toHaveBeenCalled();
    });

    it('should be a no-op for a user with no connections on this node', () => {
      const response = createResponseMock();
      service.register({ socketId: randomUUID(), response, userId: USER_ID });

      service.sendToUser({ userId: 'unknown-user', message: 'data: x\n\n' });

      expect(response.write).not.toHaveBeenCalled();
    });
  });

  describe('sendToAll', () => {
    it('should write the message to every connection', () => {
      const responses = [createResponseMock(), createResponseMock(), createResponseMock()];
      responses.forEach((response) => service.register({ socketId: randomUUID(), response, userId: USER_ID }));

      service.sendToAll('data: x\n\n');

      responses.forEach((response) => expect(response.write).toHaveBeenCalledWith('data: x\n\n'));
    });

    it('should keep writing to other connections when one write throws', () => {
      const failingResponse = createResponseMock();
      (failingResponse.write as jest.Mock).mockImplementation(() => {
        throw new Error('socket closed');
      });
      const healthyResponse = createResponseMock();
      service.register({ socketId: randomUUID(), response: failingResponse, userId: USER_ID });
      service.register({ socketId: randomUUID(), response: healthyResponse, userId: USER_ID });

      service.sendToAll('data: x\n\n');

      expect(healthyResponse.write).toHaveBeenCalledWith('data: x\n\n');
    });
  });

  describe('heartbeat', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should send a ping comment to every connection on each interval', () => {
      const responses = [createResponseMock(), createResponseMock()];
      responses.forEach((response) => service.register({ socketId: randomUUID(), response, userId: USER_ID }));

      jest.advanceTimersByTime(SSE_HEARTBEAT_INTERVAL_MS);

      responses.forEach((response) => expect(response.write).toHaveBeenCalledWith(': ping\n\n'));
    });

    it('should not start more than one heartbeat timer', () => {
      service.register({ socketId: randomUUID(), response: createResponseMock(), userId: USER_ID });
      service.register({ socketId: randomUUID(), response: createResponseMock(), userId: USER_ID });

      const actualResult = jest.getTimerCount();

      expect(actualResult).toBe(1);
    });

    it('should stop the heartbeat once the last connection is unregistered', () => {
      const connection = service.register({ socketId: randomUUID(), response: createResponseMock(), userId: USER_ID });

      service.unregister(connection.socketId);

      const actualResult = jest.getTimerCount();

      expect(actualResult).toBe(0);
    });

    it('should keep the heartbeat running while other connections remain', () => {
      const first = service.register({ socketId: randomUUID(), response: createResponseMock(), userId: USER_ID });
      const secondResponse = createResponseMock();
      service.register({ socketId: randomUUID(), response: secondResponse, userId: USER_ID });

      service.unregister(first.socketId);
      jest.advanceTimersByTime(SSE_HEARTBEAT_INTERVAL_MS);

      expect(secondResponse.write).toHaveBeenCalledWith(': ping\n\n');
    });
  });

  describe('backpressure', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should destroy a connection whose buffer exceeds the limit', () => {
      const response = createResponseMock({ writableLength: SSE_MAX_BUFFERED_BYTES + 1 });
      const connection = service.register({ socketId: randomUUID(), response, userId: USER_ID });

      const actualResult = service.send({ socketId: connection.socketId, message: 'data: x\n\n' });

      expect(actualResult).toBe(false);
      expect(response.destroy).toHaveBeenCalled();
      expect(service.getConnectionsCount()).toBe(0);
    });

    it('should destroy a connection that does not drain within the timeout', () => {
      const response = createResponseMock();
      response.write.mockReturnValue(false);
      const connection = service.register({ socketId: randomUUID(), response, userId: USER_ID });

      service.send({ socketId: connection.socketId, message: 'data: x\n\n' });
      jest.advanceTimersByTime(SSE_DRAIN_TIMEOUT_MS);

      expect(response.destroy).toHaveBeenCalled();
    });

    it('should keep a connection that drains before the timeout', () => {
      const response = createResponseMock();
      response.write.mockReturnValue(false);
      const connection = service.register({ socketId: randomUUID(), response, userId: USER_ID });

      service.send({ socketId: connection.socketId, message: 'data: x\n\n' });
      response.emit('drain');
      jest.advanceTimersByTime(SSE_DRAIN_TIMEOUT_MS);

      expect(response.destroy).not.toHaveBeenCalled();
    });

    it('should clear a pending drain timeout when the connection is unregistered', () => {
      const response = createResponseMock();
      response.write.mockReturnValue(false);
      const connection = service.register({ socketId: randomUUID(), response, userId: USER_ID });

      service.send({ socketId: connection.socketId, message: 'data: x\n\n' });
      service.unregister(connection.socketId);
      jest.advanceTimersByTime(SSE_DRAIN_TIMEOUT_MS);

      expect(response.destroy).not.toHaveBeenCalled();
    });
  });

  describe('closeAllConnections', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should end every response with a retry inside the jitter range', async () => {
      const responses = [createResponseMock(), createResponseMock(), createResponseMock()];
      responses.forEach((response) => service.register({ socketId: randomUUID(), response, userId: USER_ID }));

      await service.closeAllConnections();

      responses.forEach((response) => {
        const [chunk] = response.end.mock.calls[0];
        const retry = Number(/^retry: (\d+)\n\n$/.exec(chunk)?.[1]);

        expect(retry).toBeGreaterThanOrEqual(SSE_SHUTDOWN_RETRY_MIN_MS);
        expect(retry).toBeLessThan(SSE_SHUTDOWN_RETRY_MIN_MS + SSE_SHUTDOWN_RETRY_JITTER_MS);
      });
    });

    it('should not end a response that already ended', async () => {
      const response = createResponseMock({ writableEnded: true });
      service.register({ socketId: randomUUID(), response, userId: USER_ID });

      await service.closeAllConnections();

      expect(response.end).not.toHaveBeenCalled();
    });

    it('should empty the registry and stop the heartbeat', async () => {
      service.register({ socketId: randomUUID(), response: createResponseMock(), userId: USER_ID });

      await service.closeAllConnections();

      expect(service.getConnectionsCount()).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should clear a pending drain timeout so it does not fire after shutdown', async () => {
      const response = createResponseMock();
      response.write.mockReturnValue(false);
      const connection = service.register({ socketId: randomUUID(), response, userId: USER_ID });
      service.send({ socketId: connection.socketId, message: 'data: x\n\n' });

      await service.closeAllConnections();
      jest.advanceTimersByTime(SSE_DRAIN_TIMEOUT_MS);

      expect(response.destroy).not.toHaveBeenCalled();
    });

    it('should resolve after the flush timeout when a response never finishes', async () => {
      const response = createResponseMock();
      response.end.mockImplementation(() => {});
      service.register({ socketId: randomUUID(), response, userId: USER_ID });

      const closePromise = service.closeAllConnections();
      await jest.advanceTimersByTimeAsync(SSE_SHUTDOWN_FLUSH_TIMEOUT_MS);

      await expect(closePromise).resolves.toBeUndefined();
    });
  });
});
