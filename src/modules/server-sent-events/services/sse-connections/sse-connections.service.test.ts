import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import {
  SSE_DRAIN_TIMEOUT_MS,
  SSE_HEARTBEAT_INTERVAL_MS,
  SSE_MAX_BUFFERED_BYTES,
  SSE_SHUTDOWN_FLUSH_TIMEOUT_MS,
  SSE_SHUTDOWN_RETRY_JITTER_MS,
  SSE_SHUTDOWN_RETRY_MIN_MS,
  SseCloseReasons,
} from '../../logic/constants';
import { SseConnectionsService } from './sse-connections.service';
import type { Response } from 'express';
import type { LoggerService } from '@src/core/services/logger';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const SESSION_ID = 'session-1';
const NEVER_EXPIRES = Number.MAX_SAFE_INTEGER;

type ResponseMock = Response & {
  write: jest.Mock;
  end: jest.Mock;
  destroy: jest.Mock;
  writableFinished: boolean;
};

function createLoggerMock() {
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as LoggerService;

  return logger;
}

function createResponseMock(props?: { writableEnded?: boolean; writableLength?: number }) {
  const { writableEnded = false, writableLength = 0 } = props ?? {};

  const response = Object.assign(new EventEmitter(), {
    write: jest.fn().mockReturnValue(true),
    end: jest.fn(),
    destroy: jest.fn(),
    writableEnded,
    writableFinished: writableEnded,
    writableLength,
    destroyed: false,
  }) as unknown as ResponseMock;

  response.end.mockImplementation((_chunk: string, callback: () => void) => {
    response.writableFinished = true;
    callback();
  });

  return response;
}

describe('SseConnectionsService', () => {
  let service: SseConnectionsService;

  function getUserConnectionsCount(userId: string): number {
    const userSocketIds = service.getSocketIdsByUserId().get(userId);

    return userSocketIds?.size ?? 0;
  }

  beforeEach(() => {
    service = new SseConnectionsService(createLoggerMock());
  });

  describe('register', () => {
    it('should keep the id it was given', () => {
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: 'connection-1',
        response: createResponseMock(),
        userId: USER_ID,
      });

      expect(connection.socketId).toBe('connection-1');
    });

    it('should increase the connections count', () => {
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });

      const actualResult = service.getConnectionsCount();

      expect(actualResult).toBe(2);
    });
  });

  describe('unregister', () => {
    it('should remove only the given connection', () => {
      const first = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });
      const secondResponse = createResponseMock();
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: secondResponse,
        userId: USER_ID,
      });

      service.unregister(first.socketId);
      service.sendToAll('data: x\n\n');

      expect(secondResponse.write).toHaveBeenCalledWith('data: x\n\n');
    });

    it('should be a no-op for an unknown connection id', () => {
      const response = createResponseMock();
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

      service.unregister('unknown-id');

      const actualResult = service.getConnectionsCount();

      expect(actualResult).toBe(1);
    });
  });

  describe('user index', () => {
    it('should count connections per user', () => {
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: OTHER_USER_ID,
      });

      const expectedResult = { [USER_ID]: 2, [OTHER_USER_ID]: 1 };

      const actualResult = {
        [USER_ID]: getUserConnectionsCount(USER_ID),
        [OTHER_USER_ID]: getUserConnectionsCount(OTHER_USER_ID),
      };

      expect(actualResult).toEqual(expectedResult);
    });

    it('should return 0 for a user with no connections', () => {
      const actualResult = getUserConnectionsCount('unknown-user');

      expect(actualResult).toBe(0);
    });

    it('should decrease when one of the user connections is unregistered', () => {
      const first = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });

      service.unregister(first.socketId);

      const actualResult = getUserConnectionsCount(USER_ID);

      expect(actualResult).toBe(1);
    });

    it('should drop the user once their last connection is destroyed as a slow client', () => {
      const response = createResponseMock({ writableLength: SSE_MAX_BUFFERED_BYTES + 1 });
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

      service.send({ socketId: connection.socketId, message: 'data: x\n\n' });

      const actualResult = getUserConnectionsCount(USER_ID);

      expect(actualResult).toBe(0);
    });

    it('should drop every user on closeAllConnections', async () => {
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: OTHER_USER_ID,
      });

      await service.closeAllConnections();

      const expectedResult = [0, 0];

      const actualResult = [getUserConnectionsCount(USER_ID), getUserConnectionsCount(OTHER_USER_ID)];

      expect(actualResult).toEqual(expectedResult);
    });
  });

  describe('send', () => {
    it('should write the message to the given connection', () => {
      const response = createResponseMock();
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

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
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

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
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: firstTab,
        userId: USER_ID,
      });
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: secondTab,
        userId: USER_ID,
      });
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: otherUserResponse,
        userId: OTHER_USER_ID,
      });

      service.sendToUser({ userId: USER_ID, message: 'data: x\n\n' });

      expect(firstTab.write).toHaveBeenCalledWith('data: x\n\n');
      expect(secondTab.write).toHaveBeenCalledWith('data: x\n\n');
      expect(otherUserResponse.write).not.toHaveBeenCalled();
    });

    it('should be a no-op for a user with no connections on this node', () => {
      const response = createResponseMock();
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

      service.sendToUser({ userId: 'unknown-user', message: 'data: x\n\n' });

      expect(response.write).not.toHaveBeenCalled();
    });
  });

  describe('sendToTopic', () => {
    it('should write to every connection in the topic and to no one else', () => {
      const firstMember = createResponseMock();
      const secondMember = createResponseMock();
      const nonMember = createResponseMock();
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: firstMember,
        userId: USER_ID,
        topics: ['chat:7'],
      });
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: secondMember,
        userId: OTHER_USER_ID,
        topics: ['chat:7', 'chat:12'],
      });
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: nonMember,
        userId: 'user-3',
        topics: ['chat:12'],
      });

      service.sendToTopic({ topic: 'chat:7', message: 'data: x\n\n' });

      expect(firstMember.write).toHaveBeenCalledWith('data: x\n\n');
      expect(secondMember.write).toHaveBeenCalledWith('data: x\n\n');
      expect(nonMember.write).not.toHaveBeenCalled();
    });

    it('should stop writing to a connection once it is unregistered', () => {
      const response = createResponseMock();
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
        topics: ['chat:7'],
      });

      service.unregister(connection.socketId);
      service.sendToTopic({ topic: 'chat:7', message: 'data: x\n\n' });

      expect(response.write).not.toHaveBeenCalled();
    });
  });

  describe('addTopic', () => {
    it('should make the connection receive the topic', () => {
      const response = createResponseMock();
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

      const actualResult = service.addTopic({ socketId: connection.socketId, topic: 'chat:7' });
      service.sendToTopic({ topic: 'chat:7', message: 'data: x\n\n' });

      expect(actualResult).toBe(true);
      expect(connection.topics.has('chat:7')).toBe(true);
      expect(response.write).toHaveBeenCalledWith('data: x\n\n');
    });

    it('should return false when the connection is already in the topic', () => {
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
        topics: ['chat:7'],
      });

      const actualResult = service.addTopic({ socketId: connection.socketId, topic: 'chat:7' });

      expect(actualResult).toBe(false);
    });

    it('should return false for an unknown connection', () => {
      const actualResult = service.addTopic({ socketId: 'unknown', topic: 'chat:7' });

      expect(actualResult).toBe(false);
    });
  });

  describe('removeTopic', () => {
    it('should stop the connection from receiving the topic', () => {
      const response = createResponseMock();
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
        topics: ['chat:7'],
      });

      const actualResult = service.removeTopic({ socketId: connection.socketId, topic: 'chat:7' });
      service.sendToTopic({ topic: 'chat:7', message: 'data: x\n\n' });

      expect(actualResult).toBe(true);
      expect(connection.topics.has('chat:7')).toBe(false);
      expect(response.write).not.toHaveBeenCalled();
    });

    it('should return false when the connection is not in the topic', () => {
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });

      const actualResult = service.removeTopic({ socketId: connection.socketId, topic: 'chat:7' });

      expect(actualResult).toBe(false);
    });

    it('should keep delivering the topic to its other connections', () => {
      const leaving = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
        topics: ['chat:7'],
      });
      const stayingResponse = createResponseMock();
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: stayingResponse,
        userId: OTHER_USER_ID,
        topics: ['chat:7'],
      });

      service.removeTopic({ socketId: leaving.socketId, topic: 'chat:7' });
      service.sendToTopic({ topic: 'chat:7', message: 'data: x\n\n' });

      expect(stayingResponse.write).toHaveBeenCalledWith('data: x\n\n');
    });
  });

  describe('sendToAll', () => {
    it('should write the message to every connection', () => {
      const responses = [createResponseMock(), createResponseMock(), createResponseMock()];
      responses.forEach((response) =>
        service.register({
          sessionId: SESSION_ID,
          expiresAt: NEVER_EXPIRES,
          socketId: randomUUID(),
          response,
          userId: USER_ID,
        }),
      );

      service.sendToAll('data: x\n\n');

      responses.forEach((response) => expect(response.write).toHaveBeenCalledWith('data: x\n\n'));
    });

    it('should keep writing to other connections when one write throws', () => {
      const failingResponse = createResponseMock();
      (failingResponse.write as jest.Mock).mockImplementation(() => {
        throw new Error('socket closed');
      });
      const healthyResponse = createResponseMock();
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: failingResponse,
        userId: USER_ID,
      });
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: healthyResponse,
        userId: USER_ID,
      });

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
      responses.forEach((response) =>
        service.register({
          sessionId: SESSION_ID,
          expiresAt: NEVER_EXPIRES,
          socketId: randomUUID(),
          response,
          userId: USER_ID,
        }),
      );

      jest.advanceTimersByTime(SSE_HEARTBEAT_INTERVAL_MS);

      responses.forEach((response) => expect(response.write).toHaveBeenCalledWith(': ping\n\n'));
    });

    it('should not start more than one heartbeat timer', () => {
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });

      const actualResult = jest.getTimerCount();

      expect(actualResult).toBe(1);
    });

    it('should stop the heartbeat once the last connection is unregistered', () => {
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });

      service.unregister(connection.socketId);

      const actualResult = jest.getTimerCount();

      expect(actualResult).toBe(0);
    });

    it('should keep the heartbeat running while other connections remain', () => {
      const first = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });
      const secondResponse = createResponseMock();
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: secondResponse,
        userId: USER_ID,
      });

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
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

      const actualResult = service.send({ socketId: connection.socketId, message: 'data: x\n\n' });

      expect(actualResult).toBe(false);
      expect(response.destroy).toHaveBeenCalled();
      expect(service.getConnectionsCount()).toBe(0);
    });

    it('should destroy a connection that does not drain within the timeout', () => {
      const response = createResponseMock();
      response.write.mockReturnValue(false);
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

      service.send({ socketId: connection.socketId, message: 'data: x\n\n' });
      jest.advanceTimersByTime(SSE_DRAIN_TIMEOUT_MS);

      expect(response.destroy).toHaveBeenCalled();
    });

    it('should keep a connection that drains before the timeout', () => {
      const response = createResponseMock();
      response.write.mockReturnValue(false);
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

      service.send({ socketId: connection.socketId, message: 'data: x\n\n' });
      response.emit('drain');
      jest.advanceTimersByTime(SSE_DRAIN_TIMEOUT_MS);

      expect(response.destroy).not.toHaveBeenCalled();
    });

    it('should clear a pending drain timeout when the connection is unregistered', () => {
      const response = createResponseMock();
      response.write.mockReturnValue(false);
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

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
      responses.forEach((response) =>
        service.register({
          sessionId: SESSION_ID,
          expiresAt: NEVER_EXPIRES,
          socketId: randomUUID(),
          response,
          userId: USER_ID,
        }),
      );

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
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

      await service.closeAllConnections();

      expect(response.end).not.toHaveBeenCalled();
    });

    it('should empty the registry and stop the heartbeat', async () => {
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });

      await service.closeAllConnections();

      expect(service.getConnectionsCount()).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should clear a pending drain timeout so it does not fire after shutdown', async () => {
      const response = createResponseMock();
      response.write.mockReturnValue(false);
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });
      service.send({ socketId: connection.socketId, message: 'data: x\n\n' });

      await service.closeAllConnections();
      jest.advanceTimersByTime(SSE_DRAIN_TIMEOUT_MS);

      expect(response.destroy).not.toHaveBeenCalled();
    });

    it('should resolve after the flush timeout when a response never finishes', async () => {
      const response = createResponseMock();
      response.end.mockImplementation(() => {});
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

      const closePromise = service.closeAllConnections();
      await jest.advanceTimersByTimeAsync(SSE_SHUTDOWN_FLUSH_TIMEOUT_MS);

      await expect(closePromise).resolves.toBeUndefined();
    });

    it('should destroy the responses that did not flush by the timeout', async () => {
      const stuckResponse = createResponseMock();
      stuckResponse.end.mockImplementation(() => {});
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: stuckResponse,
        userId: USER_ID,
      });

      const closePromise = service.closeAllConnections();
      await jest.advanceTimersByTimeAsync(SSE_SHUTDOWN_FLUSH_TIMEOUT_MS);
      await closePromise;

      expect(stuckResponse.destroy).toHaveBeenCalled();
    });

    it('should not destroy the responses that flushed', async () => {
      const response = createResponseMock();
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

      await service.closeAllConnections();

      expect(response.destroy).not.toHaveBeenCalled();
    });

    it('should stop accepting connections', async () => {
      await service.closeAllConnections();

      const actualResult = service.isAcceptingConnections();

      expect(actualResult).toBe(false);
    });
  });

  describe('accepting connections', () => {
    it('should accept connections by default', () => {
      const actualResult = service.isAcceptingConnections();

      expect(actualResult).toBe(true);
    });

    it('should stop accepting connections once told to', () => {
      service.stopAcceptingConnections();

      const actualResult = service.isAcceptingConnections();

      expect(actualResult).toBe(false);
    });
  });

  describe('getConnection', () => {
    it('should return the connection with its session id', () => {
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });

      const actualResult = service.getConnection(connection.socketId)?.sessionId;

      expect(actualResult).toBe(SESSION_ID);
    });

    it('should return undefined for an unknown connection', () => {
      const actualResult = service.getConnection('unknown-id');

      expect(actualResult).toBeUndefined();
    });
  });

  describe('closeConnection', () => {
    it('should unregister the connection and end it with a jittered retry', () => {
      const response = createResponseMock();
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

      service.closeConnection({ socketId: connection.socketId, reason: SseCloseReasons.SessionEnded });

      const [chunk] = response.end.mock.calls[0];

      expect(service.getConnectionsCount()).toBe(0);
      expect(chunk).toMatch(/^retry: \d+\n\n$/);
    });

    it('should destroy a back-pressured connection instead of ending it', () => {
      const response = createResponseMock();
      response.write.mockReturnValue(false);
      const connection = service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });
      service.send({ socketId: connection.socketId, message: 'data: x\n\n' });

      service.closeConnection({ socketId: connection.socketId, reason: SseCloseReasons.SessionEnded });

      expect(response.destroy).toHaveBeenCalled();
      expect(response.end).not.toHaveBeenCalled();
    });

    it('should be a no-op for an unknown connection', () => {
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: createResponseMock(),
        userId: USER_ID,
      });

      service.closeConnection({ socketId: 'unknown-id', reason: SseCloseReasons.SessionEnded });

      expect(service.getConnectionsCount()).toBe(1);
    });
  });

  describe('token expiry', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should close a connection at the first heartbeat past its token expiry', () => {
      const response = createResponseMock();
      service.register({
        sessionId: SESSION_ID,
        expiresAt: Date.now() + 1000,
        socketId: randomUUID(),
        response,
        userId: USER_ID,
      });

      jest.advanceTimersByTime(SSE_HEARTBEAT_INTERVAL_MS);

      expect(response.end).toHaveBeenCalled();
      expect(response.write).not.toHaveBeenCalled();
    });

    it('should keep pinging the connections whose token is still valid', () => {
      const expiringResponse = createResponseMock();
      const validResponse = createResponseMock();
      service.register({
        sessionId: SESSION_ID,
        expiresAt: Date.now() + 1000,
        socketId: randomUUID(),
        response: expiringResponse,
        userId: USER_ID,
      });
      service.register({
        sessionId: SESSION_ID,
        expiresAt: NEVER_EXPIRES,
        socketId: randomUUID(),
        response: validResponse,
        userId: USER_ID,
      });

      jest.advanceTimersByTime(SSE_HEARTBEAT_INTERVAL_MS);

      expect(validResponse.write).toHaveBeenCalledWith(': ping\n\n');
      expect(service.getConnectionsCount()).toBe(1);
    });
  });
});
