import cookieParser from 'cookie-parser';
import express, { type Application } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { errorHandler } from '@src/middlewares/errorHandler.middleware';
import { TokenVerificationController } from './token-verification.controller';
import type { TokenVerificationService } from '../../services/token-verification';

describe('TokenVerificationController', () => {
  let app: Application;
  let mockTokenVerificationService: jest.Mocked<TokenVerificationService>;

  beforeEach(() => {
    app = express() as unknown as Application;
    app.use(express.json());
    app.use(cookieParser());

    app.logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    app.configService = {
      get: jest.fn().mockReturnValue({
        accessCookie: {
          name: 'accessToken',
          domain: 'localhost',
          maxAge: 60 * 60 * 1000,
        },
      }),
    } as any;

    mockTokenVerificationService = {
      verifyToken: jest.fn(),
    } as any;

    const controller = new TokenVerificationController(app, mockTokenVerificationService);
    controller.registerRoutes();
    errorHandler(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/verify-token', () => {
    it('should verify and return decoded token when valid token in cookies', async () => {
      const mockDecodedToken = { id: 'user-123', iat: 1234567890 };

      mockTokenVerificationService.verifyToken.mockResolvedValue(mockDecodedToken);

      const response = await request(app).get(API_PATHS.verifyToken).set('Cookie', ['accessToken=valid-token']);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(mockDecodedToken);
      expect(mockTokenVerificationService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(app.logger.info).toHaveBeenCalledWith(`GET ${API_PATHS.verifyToken} - verify tokens`);
    });

    it('should throw UnauthorizedError when no token in cookies', async () => {
      const response = await request(app).get(API_PATHS.verifyToken);

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body).toMatchObject({ message: 'No token provided' });
      expect(app.logger.error).toHaveBeenCalledWith('No token found in cookies');
      expect(mockTokenVerificationService.verifyToken).not.toHaveBeenCalled();
    });
  });
});
