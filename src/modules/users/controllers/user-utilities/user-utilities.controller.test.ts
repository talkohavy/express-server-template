import express, { type Application } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { errorHandler } from '@src/middlewares/errorHandler.middleware';
import { UserNotFoundError } from '../../logic/errors/user-not-found.error';
import { UserUtilitiesController } from './user-utilities.controller';
import type { UserUtilitiesService } from '../../services/user-utilities.service';

jest.mock('@src/middlewares/joi-body.middleware', () => ({
  joiBodyMiddleware: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

describe('UserUtilitiesController', () => {
  let app: Application;
  let mockUserUtilitiesService: jest.Mocked<UserUtilitiesService>;

  beforeEach(() => {
    app = express() as unknown as Application;
    app.use(express.json());

    app.logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    mockUserUtilitiesService = {
      getUserByEmail: jest.fn(),
    } as any;

    const controller = new UserUtilitiesController(app, mockUserUtilitiesService);
    controller.registerRoutes();
    errorHandler(app);
  });

  describe('POST /api/users/get-by-email', () => {
    it('should return user when found by email', async () => {
      const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };

      (mockUserUtilitiesService.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app).post(API_PATHS.getUserByEmail).send({ email: 'test@example.com' });

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(mockUser);
      expect(mockUserUtilitiesService.getUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(app.logger.info).toHaveBeenCalledWith('POST /users/get-by-email - fetching user by email');
    });

    it('should throw NotFoundError when user not found', async () => {
      const userNotFoundError = new UserNotFoundError('test@example.com');

      (mockUserUtilitiesService.getUserByEmail as jest.Mock).mockRejectedValue(userNotFoundError);

      const response = await request(app).post(API_PATHS.getUserByEmail).send({ email: 'test@example.com' });

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(mockUserUtilitiesService.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });
});
