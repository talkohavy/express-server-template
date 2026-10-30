import express, { type Application } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { TokenGenerationController } from './token-generation.controller';
import type { SessionsService } from '../../services/sessions';

jest.mock('@src/middlewares/joi-body.middleware', () => ({
  joiBodyMiddleware: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

describe('TokenGenerationController', () => {
  let app: Application;
  let mockSessionsService: { createTokens: jest.Mock };

  const mockTokens = {
    accessToken: 'mock-access-token',
    accessTokenExpiresAt: 1000,
    refreshToken: 'mock-refresh-token',
    refreshTokenExpiresAt: 2000,
  };

  beforeEach(() => {
    app = express() as unknown as Application;
    app.use(express.json());

    app.logger = {
      info: jest.fn(),
    } as any;

    mockSessionsService = { createTokens: jest.fn().mockResolvedValue(mockTokens) };

    const controller = new TokenGenerationController(app, mockSessionsService as unknown as SessionsService);
    controller.registerRoutes();
  });

  describe('POST /api/auth/tokens', () => {
    it('should create and return access and refresh tokens', async () => {
      const requestBody = { userId: 'user-123', role: 'user' };

      const response = await request(app).post(API_PATHS.createTokens).send(requestBody);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(mockTokens);
      expect(app.logger.info).toHaveBeenCalledWith(`POST ${API_PATHS.createTokens} - create tokens`);
    });

    it('should start a new session when no session is given', async () => {
      const expectedResult = { userId: 'user-123', role: 'user', session: undefined };

      await request(app).post(API_PATHS.createTokens).send({ userId: 'user-123', role: 'user' });

      const actualResult = mockSessionsService.createTokens.mock.calls[0][0];
      expect(actualResult).toEqual(expectedResult);
    });

    it('should pass the session through when one is given', async () => {
      const session = { id: '5f0c8a3e-1d2b-4c5d-8e9f-0a1b2c3d4e5f', expiresAt: 3000 };
      const expectedResult = { userId: 'user-123', role: 'user', session };

      await request(app).post(API_PATHS.createTokens).send({ userId: 'user-123', role: 'user', session });

      const actualResult = mockSessionsService.createTokens.mock.calls[0][0];
      expect(actualResult).toEqual(expectedResult);
    });
  });
});
