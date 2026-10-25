import { SSE_EVENTS_CHANNEL } from './logic/constants';
import { SsePublisherService } from './sse-publisher.service';
import type { RedisClientType } from 'redis';

describe('SsePublisherService', () => {
  let service: SsePublisherService;
  let redisPubClient: { publish: jest.Mock };

  beforeEach(() => {
    redisPubClient = { publish: jest.fn().mockResolvedValue(1) };

    service = new SsePublisherService(redisPubClient as unknown as RedisClientType);
  });

  describe('sendToUser', () => {
    it("should publish the envelope to the user's channel", async () => {
      const expectedResult = ['sse:events:user:user-1', { event: 'notification', data: { text: 'hi' } }];

      await service.sendToUser({ userId: 'user-1', event: 'notification', data: { text: 'hi' } });

      const [channel, payload] = redisPubClient.publish.mock.calls[0];
      const actualResult = [channel, JSON.parse(payload)];

      expect(actualResult).toEqual(expectedResult);
    });

    it('should return 0 when no node holds a connection of the user', async () => {
      redisPubClient.publish.mockResolvedValue(0);

      const actualResult = await service.sendToUser({ userId: 'user-1', data: 'hi' });

      expect(actualResult).toBe(0);
    });
  });

  describe('broadcast', () => {
    it('should publish the envelope to the broadcast channel', async () => {
      const expectedResult = [SSE_EVENTS_CHANNEL, { event: 'update', data: { a: 1 } }];

      await service.broadcast({ event: 'update', data: { a: 1 } });

      const [channel, payload] = redisPubClient.publish.mock.calls[0];
      const actualResult = [channel, JSON.parse(payload)];

      expect(actualResult).toEqual(expectedResult);
    });

    it('should default the event name to "message"', async () => {
      await service.broadcast({ data: 'hello' });

      const [, payload] = redisPubClient.publish.mock.calls[0];
      const actualResult = JSON.parse(payload).event;

      expect(actualResult).toBe('message');
    });

    it('should return the number of nodes that received it', async () => {
      redisPubClient.publish.mockResolvedValue(3);

      const actualResult = await service.broadcast({ data: 'hello' });

      expect(actualResult).toBe(3);
    });
  });
});
