import { SseChannelSubscriberService } from './sse-channel-subscriber.service';
import type { RedisClientType } from 'redis';
import type { LoggerService } from '@src/core/services/logger';

const CHANNEL = 'sse:events:user:user-1';

function createDeferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe('SseChannelSubscriberService', () => {
  let service: SseChannelSubscriberService;
  let redisSubClient: { subscribe: jest.Mock; unsubscribe: jest.Mock };
  let logger: { info: jest.Mock; error: jest.Mock };
  const listener = jest.fn();

  beforeEach(() => {
    redisSubClient = {
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
    };
    logger = { info: jest.fn(), error: jest.fn() };

    service = new SseChannelSubscriberService(
      logger as unknown as LoggerService,
      redisSubClient as unknown as RedisClientType,
    );
  });

  describe('subscribe', () => {
    it('should subscribe to Redis only once per channel', async () => {
      await service.subscribe({ channel: CHANNEL, listener });
      await service.subscribe({ channel: CHANNEL, listener });

      expect(redisSubClient.subscribe).toHaveBeenCalledTimes(1);
      expect(redisSubClient.subscribe).toHaveBeenCalledWith(CHANNEL, listener);
    });

    it('should make a concurrent subscriber wait for the in-flight subscription', async () => {
      const deferred = createDeferred();
      redisSubClient.subscribe.mockReturnValue(deferred.promise);

      const firstSubscribePromise = service.subscribe({ channel: CHANNEL, listener });
      const secondSubscribePromise = service.subscribe({ channel: CHANNEL, listener });

      let isSecondSettled = false;
      secondSubscribePromise.then(() => {
        isSecondSettled = true;
      });
      await Promise.resolve();

      expect(isSecondSettled).toBe(false);

      deferred.resolve();

      const actualResult = await Promise.all([firstSubscribePromise, secondSubscribePromise]);

      expect(actualResult).toEqual([true, true]);
      expect(redisSubClient.subscribe).toHaveBeenCalledTimes(1);
    });

    it('should return false and forget the channel when Redis fails, so the next subscribe retries', async () => {
      redisSubClient.subscribe.mockRejectedValueOnce(new Error('connection lost'));

      const actualResult = await service.subscribe({ channel: CHANNEL, listener });

      expect(actualResult).toBe(false);
      expect(service.getChannelsCount()).toBe(0);

      await service.subscribe({ channel: CHANNEL, listener });

      expect(redisSubClient.subscribe).toHaveBeenCalledTimes(2);
    });

    it('should fail every subscriber that waited on a failed subscription', async () => {
      const deferred = createDeferred();
      redisSubClient.subscribe.mockReturnValue(deferred.promise);

      const subscribePromises = [
        service.subscribe({ channel: CHANNEL, listener }),
        service.subscribe({ channel: CHANNEL, listener }),
      ];
      deferred.reject(new Error('connection lost'));

      const actualResult = await Promise.all(subscribePromises);

      expect(actualResult).toEqual([false, false]);
      expect(service.getChannelsCount()).toBe(0);
    });
  });

  describe('unsubscribe', () => {
    it('should keep the Redis subscription while other subscribers remain', async () => {
      await service.subscribe({ channel: CHANNEL, listener });
      await service.subscribe({ channel: CHANNEL, listener });

      await service.unsubscribe(CHANNEL);

      expect(redisSubClient.unsubscribe).not.toHaveBeenCalled();
    });

    it('should unsubscribe from Redis when the last subscriber leaves', async () => {
      await service.subscribe({ channel: CHANNEL, listener });
      await service.subscribe({ channel: CHANNEL, listener });

      await service.unsubscribe(CHANNEL);
      await service.unsubscribe(CHANNEL);

      expect(redisSubClient.unsubscribe).toHaveBeenCalledWith(CHANNEL, listener);
      expect(service.getChannelsCount()).toBe(0);
    });

    it('should subscribe to Redis again after the channel was fully released', async () => {
      await service.subscribe({ channel: CHANNEL, listener });
      await service.unsubscribe(CHANNEL);

      await service.subscribe({ channel: CHANNEL, listener });

      expect(redisSubClient.subscribe).toHaveBeenCalledTimes(2);
    });

    it('should be a no-op for an unknown channel', async () => {
      await service.unsubscribe('unknown-channel');

      expect(redisSubClient.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribeAll', () => {
    it('should unsubscribe from all of its channels in one call', async () => {
      await service.subscribe({ channel: 'channel-a', listener });
      await service.subscribe({ channel: 'channel-b', listener });

      await service.unsubscribeAll();

      expect(redisSubClient.unsubscribe).toHaveBeenCalledWith(['channel-a', 'channel-b']);
      expect(service.getChannelsCount()).toBe(0);
    });

    it('should not touch Redis when it has no channels', async () => {
      await service.unsubscribeAll();

      expect(redisSubClient.unsubscribe).not.toHaveBeenCalled();
    });

    it('should make later unsubscribes of closing connections no-ops', async () => {
      await service.subscribe({ channel: CHANNEL, listener });
      await service.unsubscribeAll();
      redisSubClient.unsubscribe.mockClear();

      await service.unsubscribe(CHANNEL);

      expect(redisSubClient.unsubscribe).not.toHaveBeenCalled();
    });
  });
});
