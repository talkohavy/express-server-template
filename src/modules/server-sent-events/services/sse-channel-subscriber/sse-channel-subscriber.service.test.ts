import { SseChannelSubscriberService } from './sse-channel-subscriber.service';
import type { RedisClientType } from 'redis';
import type { LoggerService } from '@src/core/services/logger';

const CHANNEL = 'sse:events:user:user-1';
const OTHER_CHANNEL = 'sse:events:topic:chat:7';

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
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-2', listener });

      expect(redisSubClient.subscribe).toHaveBeenCalledTimes(1);
      expect(redisSubClient.subscribe).toHaveBeenCalledWith(CHANNEL, listener);
    });

    it('should hold once when the same connection subscribes twice', async () => {
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });

      await service.unsubscribe({ channelName: CHANNEL, socketId: 'socket-1' });

      expect(redisSubClient.unsubscribe).toHaveBeenCalledWith(CHANNEL, listener);
    });

    it('should make a concurrent subscriber wait for the in-flight subscription', async () => {
      const deferred = createDeferred();
      redisSubClient.subscribe.mockReturnValue(deferred.promise);

      const firstSubscribePromise = service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      const secondSubscribePromise = service.subscribe({ channelName: CHANNEL, socketId: 'socket-2', listener });

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

      const actualResult = await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });

      expect(actualResult).toBe(false);
      expect(service.getChannelsCount()).toBe(0);
      expect(service.isSocketSubscribed({ channelName: CHANNEL, socketId: 'socket-1' })).toBe(false);

      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });

      expect(redisSubClient.subscribe).toHaveBeenCalledTimes(2);
    });

    it('should fail every subscriber that waited on a failed subscription', async () => {
      const deferred = createDeferred();
      redisSubClient.subscribe.mockReturnValue(deferred.promise);

      const subscribePromises = [
        service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener }),
        service.subscribe({ channelName: CHANNEL, socketId: 'socket-2', listener }),
      ];
      deferred.reject(new Error('connection lost'));

      const actualResult = await Promise.all(subscribePromises);

      expect(actualResult).toEqual([false, false]);
      expect(service.getChannelsCount()).toBe(0);
    });

    it('should not report a subscriber as subscribed when it arrives right after a failed SUBSCRIBE', async () => {
      const deferred = createDeferred();
      redisSubClient.subscribe.mockReturnValueOnce(deferred.promise);

      const failingSubscribePromise = service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      deferred.reject(new Error('connection lost'));
      await Promise.resolve();

      const lateSubscribePromise = service.subscribe({ channelName: CHANNEL, socketId: 'socket-2', listener });

      const actualResult = await Promise.all([failingSubscribePromise, lateSubscribePromise]);

      expect(actualResult).toEqual([false, true]);
      expect(redisSubClient.subscribe).toHaveBeenCalledTimes(2);
      expect(service.isSocketSubscribed({ channelName: CHANNEL, socketId: 'socket-2' })).toBe(true);
    });
  });

  describe('unsubscribe', () => {
    it('should keep the Redis subscription while other connections remain', async () => {
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-2', listener });

      await service.unsubscribe({ channelName: CHANNEL, socketId: 'socket-1' });

      expect(redisSubClient.unsubscribe).not.toHaveBeenCalled();
    });

    it('should unsubscribe from Redis when the last connection leaves', async () => {
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-2', listener });

      await service.unsubscribe({ channelName: CHANNEL, socketId: 'socket-1' });
      await service.unsubscribe({ channelName: CHANNEL, socketId: 'socket-2' });

      expect(redisSubClient.unsubscribe).toHaveBeenCalledWith(CHANNEL, listener);
      expect(service.getChannelsCount()).toBe(0);
    });

    it("should not drop another connection's subscription when a connection releases twice", async () => {
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-2', listener });

      await service.unsubscribe({ channelName: CHANNEL, socketId: 'socket-1' });
      await service.unsubscribe({ channelName: CHANNEL, socketId: 'socket-1' });

      expect(redisSubClient.unsubscribe).not.toHaveBeenCalled();
      expect(service.isSocketSubscribed({ channelName: CHANNEL, socketId: 'socket-2' })).toBe(true);
    });

    it("should not drop another connection's subscription when a failed subscriber was already released", async () => {
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      redisSubClient.unsubscribe.mockClear();
      const deferred = createDeferred();
      redisSubClient.subscribe.mockReturnValueOnce(deferred.promise);
      await service.unsubscribe({ channelName: CHANNEL, socketId: 'socket-1' });

      const failingSubscribePromise = service.subscribe({ channelName: CHANNEL, socketId: 'socket-2', listener });
      await service.unsubscribe({ channelName: CHANNEL, socketId: 'socket-2' });
      const survivingSubscribePromise = service.subscribe({ channelName: CHANNEL, socketId: 'socket-3', listener });
      deferred.reject(new Error('connection lost'));
      await Promise.all([failingSubscribePromise, survivingSubscribePromise]);

      expect(service.isSocketSubscribed({ channelName: CHANNEL, socketId: 'socket-3' })).toBe(true);
      expect(service.getChannelsCount()).toBe(1);
    });

    it('should subscribe to Redis again after the channel was fully released', async () => {
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      await service.unsubscribe({ channelName: CHANNEL, socketId: 'socket-1' });

      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });

      expect(redisSubClient.subscribe).toHaveBeenCalledTimes(2);
    });

    it('should be a no-op for an unknown channel', async () => {
      await service.unsubscribe({ channelName: 'unknown-channel', socketId: 'socket-1' });

      expect(redisSubClient.unsubscribe).not.toHaveBeenCalled();
    });

    it("should be a no-op for a connection that doesn't hold the channel", async () => {
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });

      await service.unsubscribe({ channelName: CHANNEL, socketId: 'socket-2' });

      expect(redisSubClient.unsubscribe).not.toHaveBeenCalled();
      expect(service.isSocketSubscribed({ channelName: CHANNEL, socketId: 'socket-1' })).toBe(true);
    });
  });

  describe('unsubscribeSocketId', () => {
    it('should release every channel the connection holds', async () => {
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      await service.subscribe({ channelName: OTHER_CHANNEL, socketId: 'socket-1', listener });

      await service.unsubscribeSocketId('socket-1');

      expect(redisSubClient.unsubscribe).toHaveBeenCalledWith(CHANNEL, listener);
      expect(redisSubClient.unsubscribe).toHaveBeenCalledWith(OTHER_CHANNEL, listener);
      expect(service.getChannelsCount()).toBe(0);
    });

    it("should leave other connections' channels alone", async () => {
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-2', listener });

      await service.unsubscribeSocketId('socket-1');

      expect(redisSubClient.unsubscribe).not.toHaveBeenCalled();
      expect(service.isSocketSubscribed({ channelName: CHANNEL, socketId: 'socket-2' })).toBe(true);
    });

    it('should be idempotent', async () => {
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-2', listener });

      await service.unsubscribeSocketId('socket-1');
      await service.unsubscribeSocketId('socket-1');

      expect(service.isSocketSubscribed({ channelName: CHANNEL, socketId: 'socket-2' })).toBe(true);
    });

    it('should release a channel whose subscription is still in flight', async () => {
      const deferred = createDeferred();
      redisSubClient.subscribe.mockReturnValueOnce(deferred.promise);

      const subscribePromise = service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      await service.unsubscribeSocketId('socket-1');
      deferred.resolve();
      await subscribePromise;

      expect(redisSubClient.unsubscribe).toHaveBeenCalledWith(CHANNEL, listener);
      expect(service.getChannelsCount()).toBe(0);
    });
  });

  describe('unsubscribeAll', () => {
    it('should unsubscribe from all of its channels in one call', async () => {
      await service.subscribe({ channelName: 'channel-a', socketId: 'socket-1', listener });
      await service.subscribe({ channelName: 'channel-b', socketId: 'socket-2', listener });

      await service.unsubscribeAll();

      expect(redisSubClient.unsubscribe).toHaveBeenCalledWith(['channel-a', 'channel-b']);
      expect(service.getChannelsCount()).toBe(0);
    });

    it('should not touch Redis when it has no channels', async () => {
      await service.unsubscribeAll();

      expect(redisSubClient.unsubscribe).not.toHaveBeenCalled();
    });

    it('should make later releases of closing connections no-ops', async () => {
      await service.subscribe({ channelName: CHANNEL, socketId: 'socket-1', listener });
      await service.unsubscribeAll();
      redisSubClient.unsubscribe.mockClear();

      await service.unsubscribeSocketId('socket-1');

      expect(redisSubClient.unsubscribe).not.toHaveBeenCalled();
    });
  });
});
