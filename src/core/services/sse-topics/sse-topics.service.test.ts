import { ADD_USER_TO_TOPIC_SCRIPT, REMOVE_USER_FROM_TOPIC_SCRIPT } from './logic/lua-scripts';
import { SseTopicsService } from './sse-topics.service';
import type { RedisClientType } from 'redis';

describe('SseTopicsService', () => {
  let service: SseTopicsService;
  let redisPubClient: { sendCommand: jest.Mock; sMembers: jest.Mock };

  beforeEach(() => {
    redisPubClient = {
      sendCommand: jest.fn().mockResolvedValue(1),
      sMembers: jest.fn().mockResolvedValue([]),
    };

    service = new SseTopicsService(redisPubClient as unknown as RedisClientType);
  });

  describe('addUserToTopic', () => {
    it("should add the topic to the user's set and publish topic-joined on the user's channel, in one script", async () => {
      const expectedResult = [
        'EVAL',
        ADD_USER_TO_TOPIC_SCRIPT,
        '1',
        'sse:user:user-1:topics',
        'chat:7',
        'sse:events:user:user-1',
        JSON.stringify({ control: 'topic-joined', topic: 'chat:7' }),
      ];

      await service.addUserToTopic({ userId: 'user-1', topic: 'chat:7' });

      const [actualResult] = redisPubClient.sendCommand.mock.calls[0];

      expect(actualResult).toEqual(expectedResult);
    });

    it('should return true when the user was added', async () => {
      const actualResult = await service.addUserToTopic({ userId: 'user-1', topic: 'chat:7' });

      expect(actualResult).toBe(true);
    });

    it('should return false when the user was already in the topic', async () => {
      redisPubClient.sendCommand.mockResolvedValue(0);

      const actualResult = await service.addUserToTopic({ userId: 'user-1', topic: 'chat:7' });

      expect(actualResult).toBe(false);
    });
  });

  describe('removeUserFromTopic', () => {
    it("should remove the topic from the user's set and publish topic-left on the user's channel, in one script", async () => {
      const expectedResult = [
        'EVAL',
        REMOVE_USER_FROM_TOPIC_SCRIPT,
        '1',
        'sse:user:user-1:topics',
        'chat:7',
        'sse:events:user:user-1',
        JSON.stringify({ control: 'topic-left', topic: 'chat:7' }),
      ];

      await service.removeUserFromTopic({ userId: 'user-1', topic: 'chat:7' });

      const [actualResult] = redisPubClient.sendCommand.mock.calls[0];

      expect(actualResult).toEqual(expectedResult);
    });

    it('should return true when the user was removed', async () => {
      const actualResult = await service.removeUserFromTopic({ userId: 'user-1', topic: 'chat:7' });

      expect(actualResult).toBe(true);
    });

    it("should return false when the user wasn't in the topic", async () => {
      redisPubClient.sendCommand.mockResolvedValue(0);

      const actualResult = await service.removeUserFromTopic({ userId: 'user-1', topic: 'chat:7' });

      expect(actualResult).toBe(false);
    });
  });

  describe('getUserTopics', () => {
    it("should return the user's topics", async () => {
      const expectedResult = ['chat:7', 'chat:12'];
      redisPubClient.sMembers.mockResolvedValue(expectedResult);

      const actualResult = await service.getUserTopics('user-1');

      expect(redisPubClient.sMembers).toHaveBeenCalledWith('sse:user:user-1:topics');
      expect(actualResult).toEqual(expectedResult);
    });
  });
});
