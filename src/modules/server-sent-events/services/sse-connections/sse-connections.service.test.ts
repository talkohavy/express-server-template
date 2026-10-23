import {
  SSE_HEARTBEAT_INTERVAL_MS,
  SSE_SHUTDOWN_FLUSH_TIMEOUT_MS,
  SSE_SHUTDOWN_RETRY_JITTER_MS,
  SSE_SHUTDOWN_RETRY_MIN_MS,
} from '../../logic/constants';
import { SseConnectionsService } from './sse-connections.service';
import type { Response } from 'express';
import type { LoggerService } from '@src/core/services/logger';

type ResponseMock = Response & {
  write: jest.Mock;
  end: jest.Mock;
};

function createLoggerMock() {
  const logger = { debug: jest.fn(), info: jest.fn(), error: jest.fn() } as unknown as LoggerService;

  return logger;
}

function createResponseMock(props?: { writableEnded?: boolean }) {
  const { writableEnded = false } = props ?? {};

  const response = {
    write: jest.fn(),
    end: jest.fn((_chunk: string, callback: () => void) => callback()),
    writableEnded,
    destroyed: false,
  } as unknown as ResponseMock;

  return response;
}

describe('SseConnectionsService', () => {
  let service: SseConnectionsService;

  beforeEach(() => {
    service = new SseConnectionsService(createLoggerMock());
  });

  describe('register', () => {
    it('should assign a unique id to every connection', () => {
      const first = service.register(createResponseMock());
      const second = service.register(createResponseMock());

      expect(first.id).not.toBe(second.id);
    });

    it('should increase the connections count', () => {
      service.register(createResponseMock());
      service.register(createResponseMock());

      const actualResult = service.getConnectionsCount();

      expect(actualResult).toBe(2);
    });
  });

  describe('unregister', () => {
    it('should remove only the given connection', () => {
      const first = service.register(createResponseMock());
      const secondResponse = createResponseMock();
      service.register(secondResponse);

      service.unregister(first.id);
      service.sendToAll('data: x\n\n');

      expect(secondResponse.write).toHaveBeenCalledWith('data: x\n\n');
    });

    it('should be a no-op for an unknown connection id', () => {
      const response = createResponseMock();
      service.register(response);

      service.unregister('unknown-id');

      const actualResult = service.getConnectionsCount();

      expect(actualResult).toBe(1);
    });
  });

  describe('send', () => {
    it('should write the message to the given connection', () => {
      const response = createResponseMock();
      const connection = service.register(response);

      const actualResult = service.send({ connectionId: connection.id, message: 'data: x\n\n' });

      expect(actualResult).toBe(true);
      expect(response.write).toHaveBeenCalledWith('data: x\n\n');
    });

    it('should return false for an unknown connection id', () => {
      const actualResult = service.send({ connectionId: 'unknown-id', message: 'data: x\n\n' });

      expect(actualResult).toBe(false);
    });

    it('should not write to a response that already ended', () => {
      const response = createResponseMock({ writableEnded: true });
      const connection = service.register(response);

      const actualResult = service.send({ connectionId: connection.id, message: 'data: x\n\n' });

      expect(actualResult).toBe(false);
      expect(response.write).not.toHaveBeenCalled();
    });
  });

  describe('sendToAll', () => {
    it('should write the message to every connection', () => {
      const responses = [createResponseMock(), createResponseMock(), createResponseMock()];
      responses.forEach((response) => service.register(response));

      service.sendToAll('data: x\n\n');

      responses.forEach((response) => expect(response.write).toHaveBeenCalledWith('data: x\n\n'));
    });

    it('should keep writing to other connections when one write throws', () => {
      const failingResponse = createResponseMock();
      (failingResponse.write as jest.Mock).mockImplementation(() => {
        throw new Error('socket closed');
      });
      const healthyResponse = createResponseMock();
      service.register(failingResponse);
      service.register(healthyResponse);

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
      responses.forEach((response) => service.register(response));

      jest.advanceTimersByTime(SSE_HEARTBEAT_INTERVAL_MS);

      responses.forEach((response) => expect(response.write).toHaveBeenCalledWith(': ping\n\n'));
    });

    it('should not start more than one heartbeat timer', () => {
      service.register(createResponseMock());
      service.register(createResponseMock());

      const actualResult = jest.getTimerCount();

      expect(actualResult).toBe(1);
    });

    it('should stop the heartbeat once the last connection is unregistered', () => {
      const connection = service.register(createResponseMock());

      service.unregister(connection.id);

      const actualResult = jest.getTimerCount();

      expect(actualResult).toBe(0);
    });

    it('should keep the heartbeat running while other connections remain', () => {
      const first = service.register(createResponseMock());
      const secondResponse = createResponseMock();
      service.register(secondResponse);

      service.unregister(first.id);
      jest.advanceTimersByTime(SSE_HEARTBEAT_INTERVAL_MS);

      expect(secondResponse.write).toHaveBeenCalledWith(': ping\n\n');
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
      responses.forEach((response) => service.register(response));

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
      service.register(response);

      await service.closeAllConnections();

      expect(response.end).not.toHaveBeenCalled();
    });

    it('should empty the registry and stop the heartbeat', async () => {
      service.register(createResponseMock());

      await service.closeAllConnections();

      expect(service.getConnectionsCount()).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should resolve after the flush timeout when a response never finishes', async () => {
      const response = createResponseMock();
      response.end.mockImplementation(() => {});
      service.register(response);

      const closePromise = service.closeAllConnections();
      await jest.advanceTimersByTimeAsync(SSE_SHUTDOWN_FLUSH_TIMEOUT_MS);

      await expect(closePromise).resolves.toBeUndefined();
    });
  });
});
