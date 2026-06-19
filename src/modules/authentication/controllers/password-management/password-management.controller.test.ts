import express, { type Application } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { errorHandler } from '@src/middlewares/errorHandler.middleware';
import { PasswordManagementController } from './password-management/password-management.controller';
import type { PasswordManagementService } from '../services/password-management.service';

jest.mock('@src/middlewares/joi-body.middleware', () => ({
  joiBodyMiddleware: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

describe('PasswordManagementController', () => {
  let app: Application;
  let mockPasswordManagementService: jest.Mocked<PasswordManagementService>;

  beforeEach(() => {
    app = express() as unknown as Application;
    app.use(express.json());

    app.logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    mockPasswordManagementService = {
      getIsPasswordValid: jest.fn(),
      generateHashedPassword: jest.fn(),
    } as any;

    const controller = new PasswordManagementController(app, mockPasswordManagementService);
    controller.registerRoutes();
    errorHandler(app);
  });

  describe('POST /api/auth/is-password-valid', () => {
    it('should return true when password is valid', async () => {
      const requestBody = {
        hashedPassword: 'salt:hashedPassword',
        password: 'correctPassword',
      };

      mockPasswordManagementService.getIsPasswordValid.mockResolvedValue(true);

      const response = await request(app).post(API_PATHS.isPasswordValid).send(requestBody);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual({ isValid: true });
      expect(mockPasswordManagementService.getIsPasswordValid).toHaveBeenCalledWith(
        'salt:hashedPassword',
        'correctPassword',
      );
      expect(app.logger.info).toHaveBeenCalledWith(`POST ${API_PATHS.isPasswordValid} - check if password is valid`);
    });

    it('should return false when password is invalid', async () => {
      const requestBody = {
        hashedPassword: 'salt:hashedPassword',
        password: 'wrongPassword',
      };

      mockPasswordManagementService.getIsPasswordValid.mockResolvedValue(false);

      const response = await request(app).post(API_PATHS.isPasswordValid).send(requestBody);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual({ isValid: false });
      expect(mockPasswordManagementService.getIsPasswordValid).toHaveBeenCalledWith(
        'salt:hashedPassword',
        'wrongPassword',
      );
    });

    it('should throw UnauthorizedError when service throws error', async () => {
      const requestBody = {
        hashedPassword: 'salt:hashedPassword',
        password: 'testPassword',
      };

      mockPasswordManagementService.getIsPasswordValid.mockRejectedValue(new Error('Service error'));

      const response = await request(app).post(API_PATHS.isPasswordValid).send(requestBody);

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body).toMatchObject({ message: 'Invalid credentials' });
      expect(app.logger.error).toHaveBeenCalledWith('Check password validity failed...', expect.any(Object));
    });
  });
});
