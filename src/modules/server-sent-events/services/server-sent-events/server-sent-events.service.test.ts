import { SSE_EVENTS_CHANNEL } from '@src/core/services/sse-publisher';
import { ServerSentEventsService } from './server-sent-events.service';
import type { RedisClientType } from 'redis';
import type { LoggerService } from '@src/core/services/logger';
import type { SsePublisherService } from '@src/core/services/sse-publisher';
import type { SseTopicsService } from '@src/core/services/sse-topics';
import type { SseChannelSubscriberService } from '../sse-channel-subscriber';
import type { SseConnectionsService } from '../sse-connections';

describe('ServerSentEventsService', () => {
  let service: ServerSentEventsService;
  let ssePublisherService: { broadcast: jest.Mock };
  let sseTopicsService: { getUserTopics: jest.Mock };
  let redisSubClient: { subscribe: jest.Mock; unsubscribe: jest.Mock };
  let sseConnectionsService: { sendToAll: jest.Mock; sendToUser: jest.Mock; sendToTopic: jest.Mock };
  let sseChannelSubscriberService: { subscribe: jest.Mock; unsubscribe: jest.Mock; unsubscribeAll: jest.Mock };
  let logger: { info: jest.Mock; error: jest.Mock };

  async function subscribeAndGetListener() {
    await service.subscribeToEvents();

    const listener: (payload: string) => void = redisSubClient.subscribe.mock.calls[0][1];

    return listener;
  }

  beforeEach(() => {
    ssePublisherService = { broadcast: jest.fn().mockResolvedValue(1) };
    sseTopicsService = { getUserTopics: jest.fn().mockResolvedValue([]) };
    redisSubClient = {
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
    };
    sseConnectionsService = { sendToAll: jest.fn(), sendToUser: jest.fn(), sendToTopic: jest.fn() };
    sseChannelSubscriberService = {
      subscribe: jest.fn().mockResolvedValue(true),
      unsubscribe: jest.fn(),
      unsubscribeAll: jest.fn(),
    };
    logger = { info: jest.fn(), error: jest.fn() };

    service = new ServerSentEventsService(
      logger as unknown as LoggerService,
      sseConnectionsService as unknown as SseConnectionsService,
      sseChannelSubscriberService as unknown as SseChannelSubscriberService,
      ssePublisherService as unknown as SsePublisherService,
      sseTopicsService as unknown as SseTopicsService,
      redisSubClient as unknown as RedisClientType,
    );
  });

  afterEach(() => {
    service.stopSimulation();
  });

  describe('forwarding Redis messages', () => {
    it('should send a formatted SSE message to all connections', async () => {
      const listener = await subscribeAndGetListener();

      listener(JSON.stringify({ event: 'update', data: { a: 1 } }));

      expect(sseConnectionsService.sendToAll).toHaveBeenCalledWith('event: update\ndata: {"a":1}\n\n');
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

  describe('user events', () => {
    async function subscribeToUserAndGetListener(userId: string) {
      await service.subscribeToUserEvents(userId);

      const { listener } = sseChannelSubscriberService.subscribe.mock.calls[0][0];

      return listener as (payload: string) => void;
    }

    it("should subscribe to the user's channel", async () => {
      await service.subscribeToUserEvents('user-1');

      const [{ channel }] = sseChannelSubscriberService.subscribe.mock.calls[0];

      expect(channel).toBe('sse:events:user:user-1');
    });

    it('should report a failed subscription', async () => {
      sseChannelSubscriberService.subscribe.mockResolvedValue(false);

      const actualResult = await service.subscribeToUserEvents('user-1');

      expect(actualResult).toBe(false);
    });

    it("should send messages from the user's channel to that user only", async () => {
      const listener = await subscribeToUserAndGetListener('user-1');

      listener(JSON.stringify({ event: 'update', data: { a: 1 } }));

      expect(sseConnectionsService.sendToUser).toHaveBeenCalledWith({
        userId: 'user-1',
        message: 'event: update\ndata: {"a":1}\n\n',
      });
      expect(sseConnectionsService.sendToAll).not.toHaveBeenCalled();
    });

    it("should ignore invalid envelopes on the user's channel", async () => {
      const listener = await subscribeToUserAndGetListener('user-1');

      listener('not-json');

      expect(sseConnectionsService.sendToUser).not.toHaveBeenCalled();
    });

    it("should unsubscribe from the user's channel", async () => {
      await service.unsubscribeFromUserEvents('user-1');

      expect(sseChannelSubscriberService.unsubscribe).toHaveBeenCalledWith('sse:events:user:user-1');
    });
  });

  describe('topic events', () => {
    function getSubscribedChannels(): string[] {
      const channels = sseChannelSubscriberService.subscribe.mock.calls.map(([{ channel }]) => channel);

      return channels;
    }

    it('should subscribe to the channel of every topic the user is in and return the topics', async () => {
      const expectedResult = ['sse:events:topic:chat:7', 'sse:events:topic:chat:12'];
      sseTopicsService.getUserTopics.mockResolvedValue(['chat:7', 'chat:12']);

      const topics = await service.subscribeToUserTopics('user-1');
      const actualResult = getSubscribedChannels();

      expect(sseTopicsService.getUserTopics).toHaveBeenCalledWith('user-1');
      expect(actualResult).toEqual(expectedResult);
      expect(topics).toEqual(['chat:7', 'chat:12']);
    });

    it('should return no topics for a user in none', async () => {
      const actualResult = await service.subscribeToUserTopics('user-1');

      expect(actualResult).toEqual([]);
      expect(sseChannelSubscriberService.subscribe).not.toHaveBeenCalled();
    });

    it("should return null when reading the user's topics fails", async () => {
      sseTopicsService.getUserTopics.mockRejectedValue(new Error('Redis down'));

      const actualResult = await service.subscribeToUserTopics('user-1');

      expect(actualResult).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return null and release the subscribed topics when one of them fails', async () => {
      sseTopicsService.getUserTopics.mockResolvedValue(['chat:7', 'chat:12']);
      sseChannelSubscriberService.subscribe.mockImplementation(
        async ({ channel }) => channel !== 'sse:events:topic:chat:12',
      );

      const actualResult = await service.subscribeToUserTopics('user-1');

      expect(actualResult).toBeNull();
      expect(sseChannelSubscriberService.unsubscribe).toHaveBeenCalledTimes(1);
      expect(sseChannelSubscriberService.unsubscribe).toHaveBeenCalledWith('sse:events:topic:chat:7');
    });

    it("should send messages from a topic's channel to that topic's connections", async () => {
      sseTopicsService.getUserTopics.mockResolvedValue(['chat:7']);
      await service.subscribeToUserTopics('user-1');
      const { listener } = sseChannelSubscriberService.subscribe.mock.calls[0][0];

      listener(JSON.stringify({ event: 'new-message', data: { chatId: '7' } }));

      expect(sseConnectionsService.sendToTopic).toHaveBeenCalledWith({
        topic: 'chat:7',
        message: 'event: new-message\ndata: {"chatId":"7"}\n\n',
      });
    });

    it("should unsubscribe from every given topic's channel", async () => {
      await service.unsubscribeFromTopics(['chat:7', 'chat:12']);

      expect(sseChannelSubscriberService.unsubscribe).toHaveBeenCalledWith('sse:events:topic:chat:7');
      expect(sseChannelSubscriberService.unsubscribe).toHaveBeenCalledWith('sse:events:topic:chat:12');
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

      expect(ssePublisherService.broadcast).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from the SSE channel', async () => {
      await service.subscribeToEvents();

      await service.cleanup();

      expect(redisSubClient.unsubscribe).toHaveBeenCalledWith(SSE_EVENTS_CHANNEL);
    });

    it('should unsubscribe from every user channel', async () => {
      await service.cleanup();

      expect(sseChannelSubscriberService.unsubscribeAll).toHaveBeenCalled();
    });

    it('should stop the simulation', async () => {
      jest.useFakeTimers();
      service.startSimulation();

      await service.cleanup();
      jest.advanceTimersByTime(5000);

      expect(ssePublisherService.broadcast).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});
