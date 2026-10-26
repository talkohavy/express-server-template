import { SseTopicsService } from './sse-topics.service';
import type { RedisClientType } from 'redis';

describe('SseTopicsService', () => {
  let service: SseTopicsService;
  let redisPubClient: { sAdd: jest.Mock; sRem: jest.Mock; sMembers: jest.Mock };

  beforeEach(() => {
    redisPubClient = {
      sAdd: jest.fn().mockResolvedValue(1),
      sRem: jest.fn().mockResolvedValue(1),
      sMembers: jest.fn().mockResolvedValue([]),
    };

    service = new SseTopicsService(redisPubClient as unknown as RedisClientType);
  });

  describe('addUserToTopic', () => {
    it("should add the topic to the user's topics set", async () => {
      await service.addUserToTopic({ userId: 'user-1', topic: 'chat:7' });

      expect(redisPubClient.sAdd).toHaveBeenCalledWith('sse:user:user-1:topics', 'chat:7');
    });

    it('should return true when the user was added', async () => {
      const actualResult = await service.addUserToTopic({ userId: 'user-1', topic: 'chat:7' });

      expect(actualResult).toBe(true);
    });

    it('should return false when the user was already in the topic', async () => {
      redisPubClient.sAdd.mockResolvedValue(0);

      const actualResult = await service.addUserToTopic({ userId: 'user-1', topic: 'chat:7' });

      expect(actualResult).toBe(false);
    });
  });

  describe('removeUserFromTopic', () => {
    it("should remove the topic from the user's topics set", async () => {
      await service.removeUserFromTopic({ userId: 'user-1', topic: 'chat:7' });

      expect(redisPubClient.sRem).toHaveBeenCalledWith('sse:user:user-1:topics', 'chat:7');
    });

    it('should return true when the user was removed', async () => {
      const actualResult = await service.removeUserFromTopic({ userId: 'user-1', topic: 'chat:7' });

      expect(actualResult).toBe(true);
    });

    it("should return false when the user wasn't in the topic", async () => {
      redisPubClient.sRem.mockResolvedValue(0);

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
