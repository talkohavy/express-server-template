import express, { type Application } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { TokenGenerationController } from './token-generation.controller';
import type { TokenGenerationService } from '../../services/token-generation';

jest.mock('@src/middlewares/joi-body.middleware', () => ({
  joiBodyMiddleware: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

describe('TokenGenerationController', () => {
  let app: Application;
  let mockTokenGenerationService: jest.Mocked<TokenGenerationService>;

  beforeEach(() => {
    app = express() as unknown as Application;
    app.use(express.json());

    app.logger = {
      info: jest.fn(),
    } as any;

    mockTokenGenerationService = {
      createTokens: jest.fn(),
      createAccessToken: jest.fn(),
      createRefreshToken: jest.fn(),
    } as any;

    const controller = new TokenGenerationController(app, mockTokenGenerationService);
    controller.registerRoutes();
  });

  describe('POST /api/auth/tokens', () => {
    it('should create and return access and refresh tokens', async () => {
      const requestBody = { userId: 'user-123', role: 'user' };
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockTokenGenerationService.createTokens.mockResolvedValue(mockTokens);

      const response = await request(app).post(API_PATHS.createTokens).send(requestBody);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(mockTokens);
      expect(mockTokenGenerationService.createTokens).toHaveBeenCalledWith({ userId: 'user-123', role: 'user' });
      expect(app.logger.info).toHaveBeenCalledWith(`POST ${API_PATHS.createTokens} - create tokens`);
    });
  });
});
