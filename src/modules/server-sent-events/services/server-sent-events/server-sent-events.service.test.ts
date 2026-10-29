import { SSE_MAX_ENVELOPE_BYTES } from '@src/core/services/sse-publisher';
import { ServerSentEventsService } from './server-sent-events.service';
import type { LoggerService } from '@src/core/services/logger';
import type { SseTopicsService } from '@src/core/services/sse-topics';
import type { SseChannelSubscriberService } from '../sse-channel-subscriber';
import type { SseConnectionsService } from '../sse-connections';

const USER_CONNECTION = { userId: 'user-1', socketId: 'socket-1' };

describe('ServerSentEventsService', () => {
  let service: ServerSentEventsService;
  let sseTopicsService: { getUserTopics: jest.Mock };
  let sseConnectionsService: {
    sendToAll: jest.Mock;
    sendToUser: jest.Mock;
    sendToTopic: jest.Mock;
    addTopic: jest.Mock;
    removeTopic: jest.Mock;
    getSocketIdsByUserId: jest.Mock;
  };
  let sseChannelSubscriberService: {
    subscribe: jest.Mock;
    unsubscribe: jest.Mock;
    unsubscribeSocketId: jest.Mock;
    unsubscribeAll: jest.Mock;
    isSocketSubscribed: jest.Mock;
  };
  let logger: { info: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    sseTopicsService = { getUserTopics: jest.fn().mockResolvedValue([]) };
    sseConnectionsService = {
      sendToAll: jest.fn(),
      sendToUser: jest.fn(),
      sendToTopic: jest.fn(),
      addTopic: jest.fn().mockReturnValue(true),
      removeTopic: jest.fn().mockReturnValue(true),
      getSocketIdsByUserId: jest.fn().mockReturnValue(new Map()),
    };
    sseChannelSubscriberService = {
      subscribe: jest.fn().mockResolvedValue(true),
      unsubscribe: jest.fn(),
      unsubscribeSocketId: jest.fn(),
      unsubscribeAll: jest.fn(),
      isSocketSubscribed: jest.fn().mockReturnValue(false),
    };
    logger = { info: jest.fn(), error: jest.fn() };

    service = new ServerSentEventsService(
      logger as unknown as LoggerService,
      sseConnectionsService as unknown as SseConnectionsService,
      sseChannelSubscriberService as unknown as SseChannelSubscriberService,
      sseTopicsService as unknown as SseTopicsService,
    );
  });

  describe('user events', () => {
    async function subscribeToUserAndGetListener() {
      await service.subscribeToUserEvents(USER_CONNECTION);

      const { listener } = sseChannelSubscriberService.subscribe.mock.calls[0][0];

      return listener as (payload: string) => void;
    }

    it("should hold the user's channel for the connection", async () => {
      await service.subscribeToUserEvents(USER_CONNECTION);

      const [{ channelName, socketId }] = sseChannelSubscriberService.subscribe.mock.calls[0];

      expect(channelName).toBe('sse:events:user:user-1');
      expect(socketId).toBe('socket-1');
    });

    it('should report a failed subscription', async () => {
      sseChannelSubscriberService.subscribe.mockResolvedValue(false);

      const actualResult = await service.subscribeToUserEvents(USER_CONNECTION);

      expect(actualResult).toBe(false);
    });

    it("should send messages from the user's channel to that user only", async () => {
      const listener = await subscribeToUserAndGetListener();

      listener(JSON.stringify({ event: 'update', data: { a: 1 } }));

      expect(sseConnectionsService.sendToUser).toHaveBeenCalledWith({
        userId: 'user-1',
        message: 'event: update\ndata: {"a":1}\n\n',
      });
      expect(sseConnectionsService.sendToAll).not.toHaveBeenCalled();
    });

    it("should ignore invalid envelopes on the user's channel", async () => {
      const listener = await subscribeToUserAndGetListener();

      listener('not-json');

      expect(sseConnectionsService.sendToUser).not.toHaveBeenCalled();
    });

    it("should ignore envelopes without an event name on the user's channel", async () => {
      const listener = await subscribeToUserAndGetListener();

      listener(JSON.stringify({ data: { a: 1 } }));

      expect(sseConnectionsService.sendToUser).not.toHaveBeenCalled();
    });

    it("should drop an oversized envelope on the user's channel and log it", async () => {
      const listener = await subscribeToUserAndGetListener();

      listener(JSON.stringify({ event: 'update', data: 'x'.repeat(SSE_MAX_ENVELOPE_BYTES) }));

      expect(sseConnectionsService.sendToUser).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('SSE pub/sub: oversized envelope dropped', expect.any(Object));
    });
  });

  describe('releaseConnectionSubscriptions', () => {
    it('should release every channel the connection holds', async () => {
      await service.releaseConnectionSubscriptions('socket-1');

      expect(sseChannelSubscriberService.unsubscribeSocketId).toHaveBeenCalledWith('socket-1');
    });
  });

  describe('topic events', () => {
    function getSubscribedChannels(): string[] {
      const channels = sseChannelSubscriberService.subscribe.mock.calls.map(([{ channelName }]) => channelName);

      return channels;
    }

    it('should subscribe to the channel of every topic the user is in and return the topics', async () => {
      const expectedResult = ['sse:events:topic:chat:7', 'sse:events:topic:chat:12'];
      sseTopicsService.getUserTopics.mockResolvedValue(['chat:7', 'chat:12']);

      const topics = await service.subscribeToUserTopics(USER_CONNECTION);
      const actualResult = getSubscribedChannels();

      expect(sseTopicsService.getUserTopics).toHaveBeenCalledWith('user-1');
      expect(actualResult).toEqual(expectedResult);
      expect(topics).toEqual(['chat:7', 'chat:12']);
    });

    it('should return no topics for a user in none', async () => {
      const actualResult = await service.subscribeToUserTopics(USER_CONNECTION);

      expect(actualResult).toEqual([]);
      expect(sseChannelSubscriberService.subscribe).not.toHaveBeenCalled();
    });

    it("should return null when reading the user's topics fails", async () => {
      sseTopicsService.getUserTopics.mockRejectedValue(new Error('Redis down'));

      const actualResult = await service.subscribeToUserTopics(USER_CONNECTION);

      expect(actualResult).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should hold every topic channel for the connection', async () => {
      sseTopicsService.getUserTopics.mockResolvedValue(['chat:7', 'chat:12']);

      await service.subscribeToUserTopics(USER_CONNECTION);
      const actualResult = sseChannelSubscriberService.subscribe.mock.calls.map(([{ socketId }]) => socketId);

      expect(actualResult).toEqual(['socket-1', 'socket-1']);
    });

    it('should return null when subscribing to one of the topics fails', async () => {
      sseTopicsService.getUserTopics.mockResolvedValue(['chat:7', 'chat:12']);
      sseChannelSubscriberService.subscribe.mockImplementation(
        async ({ channelName }) => channelName !== 'sse:events:topic:chat:12',
      );

      const actualResult = await service.subscribeToUserTopics(USER_CONNECTION);

      expect(actualResult).toBeNull();
    });

    it("should send messages from a topic's channel to that topic's connections", async () => {
      sseTopicsService.getUserTopics.mockResolvedValue(['chat:7']);
      await service.subscribeToUserTopics(USER_CONNECTION);
      const { listener } = sseChannelSubscriberService.subscribe.mock.calls[0][0];

      listener(JSON.stringify({ event: 'new-message', data: { chatId: '7' } }));

      expect(sseConnectionsService.sendToTopic).toHaveBeenCalledWith({
        topic: 'chat:7',
        message: 'event: new-message\ndata: {"chatId":"7"}\n\n',
      });
    });

    it("should drop an oversized envelope on a topic's channel", async () => {
      sseTopicsService.getUserTopics.mockResolvedValue(['chat:7']);
      await service.subscribeToUserTopics(USER_CONNECTION);
      const { listener } = sseChannelSubscriberService.subscribe.mock.calls[0][0];

      listener(JSON.stringify({ event: 'new-message', data: 'x'.repeat(SSE_MAX_ENVELOPE_BYTES) }));

      expect(sseConnectionsService.sendToTopic).not.toHaveBeenCalled();
    });
  });

  describe('topic changes (control messages on the user channel)', () => {
    const TOPIC_JOINED = JSON.stringify({ control: 'topic-joined', props: { topic: 'chat:7' } });
    const TOPIC_LEFT = JSON.stringify({ control: 'topic-left', props: { topic: 'chat:7' } });

    async function subscribeToUserAndGetListener() {
      await service.subscribeToUserEvents(USER_CONNECTION);

      const { listener } = sseChannelSubscriberService.subscribe.mock.calls[0][0];

      sseChannelSubscriberService.subscribe.mockClear();

      return listener as (payload: string) => void;
    }

    function givenOpenConnections(socketIds: string[]) {
      sseConnectionsService.getSocketIdsByUserId.mockReturnValue(new Map([['user-1', new Set(socketIds)]]));
    }

    it("should add the topic to every open connection of the user and subscribe to the topic's channel", async () => {
      givenOpenConnections(['socket-1', 'socket-2']);
      const listener = await subscribeToUserAndGetListener();

      listener(TOPIC_JOINED);
      await Promise.resolve();

      expect(sseConnectionsService.addTopic).toHaveBeenCalledWith({ socketId: 'socket-1', topic: 'chat:7' });
      expect(sseConnectionsService.addTopic).toHaveBeenCalledWith({ socketId: 'socket-2', topic: 'chat:7' });
      expect(sseChannelSubscriberService.subscribe).toHaveBeenCalledTimes(2);
      expect(sseChannelSubscriberService.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({ channelName: 'sse:events:topic:chat:7', socketId: 'socket-1' }),
      );
      expect(sseChannelSubscriberService.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({ channelName: 'sse:events:topic:chat:7', socketId: 'socket-2' }),
      );
    });

    it('should never forward a control message to the browser', async () => {
      givenOpenConnections(['socket-1']);
      const listener = await subscribeToUserAndGetListener();

      listener(TOPIC_JOINED);

      expect(sseConnectionsService.sendToUser).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should not subscribe again for a connection already in the topic', async () => {
      givenOpenConnections(['socket-1']);
      sseConnectionsService.addTopic.mockReturnValue(false);
      const listener = await subscribeToUserAndGetListener();

      listener(TOPIC_JOINED);

      expect(sseChannelSubscriberService.subscribe).not.toHaveBeenCalled();
    });

    it("should drop the topic from the connection when subscribing to the topic's channel fails", async () => {
      givenOpenConnections(['socket-1']);
      const listener = await subscribeToUserAndGetListener();
      sseChannelSubscriberService.subscribe.mockResolvedValue(false);

      listener(TOPIC_JOINED);
      await new Promise(process.nextTick);

      expect(sseConnectionsService.removeTopic).toHaveBeenCalledWith({ socketId: 'socket-1', topic: 'chat:7' });
    });

    it('should keep the topic when its subscription failed but a later join already holds the channel again', async () => {
      givenOpenConnections(['socket-1']);
      const listener = await subscribeToUserAndGetListener();
      sseChannelSubscriberService.subscribe.mockResolvedValue(false);
      sseChannelSubscriberService.isSocketSubscribed.mockReturnValue(true);

      listener(TOPIC_JOINED);
      await new Promise(process.nextTick);

      expect(sseConnectionsService.removeTopic).not.toHaveBeenCalled();
    });

    it('should log, not reject, when applying a topic change throws', async () => {
      givenOpenConnections(['socket-1']);
      const listener = await subscribeToUserAndGetListener();
      const error = new Error('connection lost');
      sseChannelSubscriberService.subscribe.mockRejectedValue(error);

      listener(TOPIC_JOINED);
      await new Promise(process.nextTick);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to apply SSE control message',
        expect.objectContaining({ socketId: 'socket-1', error }),
      );
    });

    it("should remove the topic from the user's open connections and release the connection's hold on its channel", async () => {
      givenOpenConnections(['socket-1']);
      const listener = await subscribeToUserAndGetListener();

      listener(TOPIC_LEFT);

      expect(sseConnectionsService.removeTopic).toHaveBeenCalledWith({ socketId: 'socket-1', topic: 'chat:7' });
      expect(sseChannelSubscriberService.unsubscribe).toHaveBeenCalledWith({
        channelName: 'sse:events:topic:chat:7',
        socketId: 'socket-1',
      });
    });

    it('should still release the hold for a connection whose topic was already removed', async () => {
      givenOpenConnections(['socket-1']);
      sseConnectionsService.removeTopic.mockReturnValue(false);
      const listener = await subscribeToUserAndGetListener();

      listener(TOPIC_LEFT);

      expect(sseChannelSubscriberService.unsubscribe).toHaveBeenCalledWith({
        channelName: 'sse:events:topic:chat:7',
        socketId: 'socket-1',
      });
    });

    it('should hold changes for a connection whose topics are loading, and apply them once it completes', async () => {
      const listener = await subscribeToUserAndGetListener();
      let resolveUserTopics: (topics: string[]) => void = () => {};
      sseTopicsService.getUserTopics.mockReturnValue(
        new Promise<string[]>((resolve) => {
          resolveUserTopics = resolve;
        }),
      );

      const topicsPromise = service.subscribeToUserTopics(USER_CONNECTION);
      listener(TOPIC_JOINED);
      resolveUserTopics([]);
      await topicsPromise;

      expect(sseConnectionsService.addTopic).not.toHaveBeenCalled();

      service.completeTopicsLoad(USER_CONNECTION);

      expect(sseConnectionsService.addTopic).toHaveBeenCalledWith({ socketId: 'socket-1', topic: 'chat:7' });
    });

    it('should apply held changes in the order they arrived', async () => {
      const listener = await subscribeToUserAndGetListener();
      const calls: string[] = [];
      sseConnectionsService.addTopic.mockImplementation(() => calls.push('add'));
      sseConnectionsService.removeTopic.mockImplementation(() => calls.push('remove'));
      let resolveUserTopics: (topics: string[]) => void = () => {};
      sseTopicsService.getUserTopics.mockReturnValue(
        new Promise<string[]>((resolve) => {
          resolveUserTopics = resolve;
        }),
      );

      const topicsPromise = service.subscribeToUserTopics(USER_CONNECTION);
      listener(TOPIC_JOINED);
      listener(TOPIC_LEFT);
      resolveUserTopics([]);
      await topicsPromise;
      service.completeTopicsLoad(USER_CONNECTION);

      expect(calls).toEqual(['add', 'remove']);
    });

    it('should stop holding changes once the load completes', async () => {
      const listener = await subscribeToUserAndGetListener();
      await service.subscribeToUserTopics(USER_CONNECTION);
      service.completeTopicsLoad(USER_CONNECTION);

      listener(TOPIC_JOINED);
      service.completeTopicsLoad(USER_CONNECTION);

      expect(sseConnectionsService.addTopic).not.toHaveBeenCalled();
    });

    it('should stop holding changes when loading the topics fails', async () => {
      const listener = await subscribeToUserAndGetListener();
      sseTopicsService.getUserTopics.mockRejectedValue(new Error('Redis down'));
      await service.subscribeToUserTopics(USER_CONNECTION);

      listener(TOPIC_JOINED);
      service.completeTopicsLoad(USER_CONNECTION);

      expect(sseConnectionsService.addTopic).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from every channel this node holds', async () => {
      await service.cleanup();

      expect(sseChannelSubscriberService.unsubscribeAll).toHaveBeenCalled();
    });
  });
});
