import express, { type Application } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { UnauthorizedError } from '@src/core/errors';
import { errorHandler } from '@src/middlewares/errorHandler.middleware';
import { SessionManagementController } from './session-management.controller';
import type { SessionsService } from '../../services/sessions';

jest.mock('@src/middlewares/joi-body.middleware', () => ({
  joiBodyMiddleware: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

describe('SessionManagementController', () => {
  let app: Application;
  let mockSessionsService: { consumeRefreshToken: jest.Mock; revokeSession: jest.Mock };

  const consumedToken = { userId: '7', session: { id: 'session-id', expiresAt: 3000 } };
  const revokedSession = { userId: '7', sessionId: 'session-id' };

  beforeEach(() => {
    app = express() as unknown as Application;
    app.use(express.json());

    app.logger = { info: jest.fn(), error: jest.fn() } as any;

    mockSessionsService = {
      consumeRefreshToken: jest.fn().mockResolvedValue(consumedToken),
      revokeSession: jest.fn().mockResolvedValue(revokedSession),
    };

    const controller = new SessionManagementController(app, mockSessionsService as unknown as SessionsService);
    controller.registerRoutes();
    errorHandler(app);
  });

  describe('POST /api/auth/consume-refresh-token', () => {
    it('should consume the given refresh token', async () => {
      await request(app).post(API_PATHS.consumeRefreshToken).send({ refreshToken: 'raw-refresh-token' });

      expect(mockSessionsService.consumeRefreshToken).toHaveBeenCalledWith('raw-refresh-token');
    });

    it('should return the user and the session of the consumed token', async () => {
      const expectedResult = consumedToken;

      const response = await request(app)
        .post(API_PATHS.consumeRefreshToken)
        .send({ refreshToken: 'raw-refresh-token' });

      const actualResult = response.body;
      expect(actualResult).toEqual(expectedResult);
    });

    it('should respond with 401 when the token cannot be consumed', async () => {
      mockSessionsService.consumeRefreshToken.mockRejectedValue(new UnauthorizedError());

      const response = await request(app)
        .post(API_PATHS.consumeRefreshToken)
        .send({ refreshToken: 'used-refresh-token' });

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });
  });

  describe('POST /api/auth/revoke-session', () => {
    it('should revoke the session of the given refresh token', async () => {
      await request(app).post(API_PATHS.revokeSession).send({ refreshToken: 'raw-refresh-token' });

      expect(mockSessionsService.revokeSession).toHaveBeenCalledWith('raw-refresh-token');
    });

    it('should return the ended session', async () => {
      const expectedResult = revokedSession;

      const response = await request(app).post(API_PATHS.revokeSession).send({ refreshToken: 'raw-refresh-token' });

      const actualResult = response.body;
      expect(actualResult).toEqual(expectedResult);
    });

    it('should return null when the token is unknown', async () => {
      mockSessionsService.revokeSession.mockResolvedValue(null);

      const response = await request(app).post(API_PATHS.revokeSession).send({ refreshToken: 'unknown-token' });

      const actualResult = JSON.parse(response.text);
      expect(actualResult).toBeNull();
    });
  });
});
