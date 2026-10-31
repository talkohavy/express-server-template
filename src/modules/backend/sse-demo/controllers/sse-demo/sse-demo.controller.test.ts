import cookieParser from 'cookie-parser';
import express, { type Application } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { UnauthorizedError } from '@src/core/errors';
import { errorHandler } from '@src/middlewares/errorHandler.middleware';
import { SseDemoEventNames } from '../../logic/constants';
import { SseDemoController } from './sse-demo.controller';
import type { CookiesConfig } from '@src/plugins/config-service';
import type { IAuthAdapter } from '../../../login/adapters/auth.adapter.interface';

describe('SseDemoController', () => {
  const now = new Date('2026-01-01T00:00:00.000Z').getTime();
  const cookiesConfig: CookiesConfig = {
    accessCookie: { name: 'access_token', path: '/', isSecure: false },
    refreshCookie: { name: 'refresh_token', path: '/api/auth', isSecure: false },
  };
  const accessCookie = 'access_token=valid-access-token';

  let app: Application;
  let authAdapter: { verifyToken: jest.Mock };
  let sseTopics: { getUserTopics: jest.Mock; addUserToTopic: jest.Mock; removeUserFromTopic: jest.Mock };
  let ssePublisher: { sendToTopic: jest.Mock; sendToUser: jest.Mock };

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    app = express() as unknown as Application;
    app.use(express.json());
    app.use(cookieParser());

    app.logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() } as any;
    app.configService = { get: jest.fn().mockReturnValue(cookiesConfig) } as any;

    authAdapter = { verifyToken: jest.fn().mockResolvedValue({ id: 7, role: 'admin', sid: 'session-id' }) };
    sseTopics = {
      getUserTopics: jest.fn().mockResolvedValue(['chat:7']),
      addUserToTopic: jest.fn().mockResolvedValue(true),
      removeUserFromTopic: jest.fn().mockResolvedValue(true),
    };
    ssePublisher = { sendToTopic: jest.fn().mockResolvedValue(2), sendToUser: jest.fn().mockResolvedValue(1) };
    app.sseTopics = sseTopics as any;
    app.ssePublisher = ssePublisher as any;

    const controller = new SseDemoController(app, authAdapter as unknown as IAuthAdapter);
    controller.registerRoutes();
    errorHandler(app);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('authentication', () => {
    it('should respond with 401 without an access cookie', async () => {
      const response = await request(app).get(API_PATHS.sseDemoTopics);

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    it('should respond with 401 when the access token is invalid', async () => {
      authAdapter.verifyToken.mockRejectedValue(new UnauthorizedError('Invalid or expired access token'));

      const response = await request(app).get(API_PATHS.sseDemoTopics).set('Cookie', [accessCookie]);

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    it('should verify the token from the access cookie', async () => {
      await request(app).get(API_PATHS.sseDemoTopics).set('Cookie', [accessCookie]);

      expect(authAdapter.verifyToken).toHaveBeenCalledWith('valid-access-token');
    });
  });

  describe(`GET ${API_PATHS.sseDemoTopics}`, () => {
    it("should respond with the user's topics, sorted", async () => {
      const expectedResult = { topics: ['chat:1', 'chat:7'] };
      sseTopics.getUserTopics.mockResolvedValue(['chat:7', 'chat:1']);

      const response = await request(app).get(API_PATHS.sseDemoTopics).set('Cookie', [accessCookie]);

      const actualResult = response.body;
      expect(actualResult).toEqual(expectedResult);
    });

    it('should read the topics of the user from the token', async () => {
      await request(app).get(API_PATHS.sseDemoTopics).set('Cookie', [accessCookie]);

      expect(sseTopics.getUserTopics).toHaveBeenCalledWith('7');
    });
  });

  describe(`POST ${API_PATHS.sseDemoJoinTopic}`, () => {
    function postJoin(body: object) {
      return request(app).post(API_PATHS.sseDemoJoinTopic).set('Cookie', [accessCookie]).send(body);
    }

    it('should add the user to the trimmed topic', async () => {
      const expectedResult = { userId: '7', topic: 'chat:7' };

      await postJoin({ topic: '  chat:7 ' });

      const actualResult = sseTopics.addUserToTopic.mock.calls[0][0];
      expect(actualResult).toEqual(expectedResult);
    });

    it('should respond with whether the user was added', async () => {
      const expectedResult = { isAdded: false };
      sseTopics.addUserToTopic.mockResolvedValue(false);

      const response = await postJoin({ topic: 'chat:7' });

      const actualResult = response.body;
      expect(actualResult).toEqual(expectedResult);
    });

    it('should respond with 400 for a topic with spaces', async () => {
      const response = await postJoin({ topic: 'chat 7' });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it('should respond with 400 without a topic', async () => {
      const response = await postJoin({});

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe(`POST ${API_PATHS.sseDemoLeaveTopic}`, () => {
    function postLeave(body: object) {
      return request(app).post(API_PATHS.sseDemoLeaveTopic).set('Cookie', [accessCookie]).send(body);
    }

    it('should remove the user from the topic', async () => {
      const expectedResult = { userId: '7', topic: 'chat:7' };

      await postLeave({ topic: 'chat:7' });

      const actualResult = sseTopics.removeUserFromTopic.mock.calls[0][0];
      expect(actualResult).toEqual(expectedResult);
    });

    it('should respond with whether the user was removed', async () => {
      const expectedResult = { isRemoved: true };

      const response = await postLeave({ topic: 'chat:7' });

      const actualResult = response.body;
      expect(actualResult).toEqual(expectedResult);
    });
  });

  describe(`POST ${API_PATHS.sseDemoSendToTopic}`, () => {
    function postSendToTopic(body: object) {
      return request(app).post(API_PATHS.sseDemoSendToTopic).set('Cookie', [accessCookie]).send(body);
    }

    it('should publish a topic-message event to the topic', async () => {
      const expectedResult = {
        topic: 'chat:7',
        event: SseDemoEventNames.TopicMessage,
        data: { topic: 'chat:7', text: 'hello', fromUserId: '7', sentAt: now },
      };

      await postSendToTopic({ topic: 'chat:7', text: 'hello' });

      const actualResult = ssePublisher.sendToTopic.mock.calls[0][0];
      expect(actualResult).toEqual(expectedResult);
    });

    it('should respond with the number of receiving nodes', async () => {
      const expectedResult = { receivingNodesCount: 2 };

      const response = await postSendToTopic({ topic: 'chat:7', text: 'hello' });

      const actualResult = response.body;
      expect(actualResult).toEqual(expectedResult);
    });

    it('should respond with 403 when the user is not in the topic', async () => {
      const response = await postSendToTopic({ topic: 'chat:8', text: 'hello' });

      expect(response.status).toBe(StatusCodes.FORBIDDEN);
    });

    it('should not publish when the user is not in the topic', async () => {
      await postSendToTopic({ topic: 'chat:8', text: 'hello' });

      expect(ssePublisher.sendToTopic).not.toHaveBeenCalled();
    });

    it('should respond with 400 for a text that is too long', async () => {
      const response = await postSendToTopic({ topic: 'chat:7', text: 'a'.repeat(501) });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe(`POST ${API_PATHS.sseDemoSendToUser}`, () => {
    function postSendToUser(body: object) {
      return request(app).post(API_PATHS.sseDemoSendToUser).set('Cookie', [accessCookie]).send(body);
    }

    it('should publish a user-message event to the target user, from the sender', async () => {
      const expectedResult = {
        userId: '12',
        event: SseDemoEventNames.UserMessage,
        data: { text: 'hello', fromUserId: '7', sentAt: now },
      };

      await postSendToUser({ userId: '12', text: 'hello' });

      const actualResult = ssePublisher.sendToUser.mock.calls[0][0];
      expect(actualResult).toEqual(expectedResult);
    });

    it('should respond with the number of receiving nodes', async () => {
      const expectedResult = { receivingNodesCount: 1 };

      const response = await postSendToUser({ userId: '12', text: 'hello' });

      const actualResult = response.body;
      expect(actualResult).toEqual(expectedResult);
    });

    it('should respond with 400 without a user id', async () => {
      const response = await postSendToUser({ text: 'hello' });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });
  });
});
