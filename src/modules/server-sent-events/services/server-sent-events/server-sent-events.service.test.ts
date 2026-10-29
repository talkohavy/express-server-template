import { SSE_EVENTS_CHANNEL } from '../../logic/constants';
import { ServerSentEventsService } from './server-sent-events.service';
import type { RedisClientType } from 'redis';
import type { LoggerService } from '@src/core/services/logger';
import type { SseConnectionsService } from '../sse-connections';

describe('ServerSentEventsService', () => {
  let service: ServerSentEventsService;
  let redisPubClient: { publish: jest.Mock };
  let redisSubClient: { subscribe: jest.Mock };
  let sseConnectionsService: { sendToAll: jest.Mock };
  let logger: { info: jest.Mock; error: jest.Mock };

  async function subscribeAndGetListener() {
    await service.subscribeToEvents();

    const listener: (payload: string) => void = redisSubClient.subscribe.mock.calls[0][1];

    return listener;
  }

  beforeEach(() => {
    redisPubClient = { publish: jest.fn().mockResolvedValue(1) };
    redisSubClient = { subscribe: jest.fn().mockResolvedValue(undefined) };
    sseConnectionsService = { sendToAll: jest.fn() };
    logger = { info: jest.fn(), error: jest.fn() };

    service = new ServerSentEventsService(
      logger as unknown as LoggerService,
      sseConnectionsService as unknown as SseConnectionsService,
      redisPubClient as unknown as RedisClientType,
      redisSubClient as unknown as RedisClientType,
    );
  });

  afterEach(() => {
    service.stopSimulation();
  });

  describe('broadcast', () => {
    it('should publish the envelope to the SSE channel', async () => {
      const expectedResult = { event: 'update', data: { a: 1 } };

      await service.broadcast({ event: 'update', data: { a: 1 } });

      const [channel, payload] = redisPubClient.publish.mock.calls[0];
      const actualResult = JSON.parse(payload);

      expect(channel).toBe(SSE_EVENTS_CHANNEL);
      expect(actualResult).toEqual(expectedResult);
    });

    it('should default the event name to "message"', async () => {
      await service.broadcast({ data: 'hello' });

      const [, payload] = redisPubClient.publish.mock.calls[0];
      const actualResult = JSON.parse(payload).event;

      expect(actualResult).toBe('message');
    });
  });

  describe('forwarding Redis messages', () => {
    it('should send a formatted SSE message to all connections', async () => {
      const listener = await subscribeAndGetListener();

      listener(JSON.stringify({ event: 'update', data: { a: 1 } }));

      expect(sseConnectionsService.sendToAll).toHaveBeenCalledWith({ message: 'event: update\ndata: {"a":1}\n\n' });
    });

    it('should ignore invalid JSON payloads', async () => {
      const listener = await subscribeAndGetListener();

      listener('not-json');

      expect(sseConnectionsService.sendToAll).not.toHaveBeenCalled();
    });

    it('should ignore envelopes without an event name', async () => {
      const listener = await subscribeAndGetListener();

      listener(JSON.stringify({ data: { a: 1 } }));

      expect(sseConnectionsService.sendToAll).not.toHaveBeenCalled();
    });
  });

  describe('simulation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should stop publishing after stopSimulation is called', () => {
      service.startSimulation();
      jest.advanceTimersByTime(1000);

      service.stopSimulation();
      jest.advanceTimersByTime(5000);

      expect(redisPubClient.publish).toHaveBeenCalledTimes(1);
    });
  });
});
