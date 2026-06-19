import express, { type Application } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { errorHandler } from '@src/middlewares/errorHandler.middleware';
import { giveAllPermissionsToUser } from '../../../../../toolbox/tests/mocks/mockUserPermissions';
import { UsersCrudController } from './users-crud.controller';
import type { UsersCrudService } from '../../services/users-crud/users-crud.service';

jest.mock('@src/middlewares/joi-body.middleware', () => ({
  joiBodyMiddleware: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

describe('UsersCrudController', () => {
  let app: Application;
  let mockUsersService: jest.Mocked<UsersCrudService>;

  beforeEach(() => {
    app = express() as unknown as Application;
    app.use(express.json());

    app.logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    mockUsersService = {
      createUser: jest.fn(),
      getUsers: jest.fn(),
      getUserById: jest.fn(),
      updateUserById: jest.fn(),
      deleteUserById: jest.fn(),
    } as any;

    const controller = new UsersCrudController(app, mockUsersService);
    giveAllPermissionsToUser(app);
    controller.registerRoutes();
    errorHandler(app);
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = { email: 'test@example.com', name: 'Test User', password: 'password123' };
      const createdUser = { id: '123', ...newUser };

      (mockUsersService.createUser as jest.Mock).mockResolvedValue(createdUser);

      const response = await request(app).post(API_PATHS.users).send(newUser);

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(response.body).toEqual(createdUser);
      expect(mockUsersService.createUser).toHaveBeenCalledWith(newUser);
      expect(app.logger.info).toHaveBeenCalledWith(`POST ${API_PATHS.users} - create new user`);
    });
  });

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@example.com', name: 'User 1' },
        { id: '2', email: 'user2@example.com', name: 'User 2' },
      ];

      (mockUsersService.getUsers as jest.Mock).mockResolvedValue(mockUsers);

      const response = await request(app).get(API_PATHS.users);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(mockUsers);
      expect(mockUsersService.getUsers).toHaveBeenCalledWith({});
      expect(app.logger.info).toHaveBeenCalledWith(`GET ${API_PATHS.users} - get all users`);
    });
  });

  describe('GET /api/users/:userId', () => {
    it('should return user by id', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

      (mockUsersService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app).get('/api/users/user-123');

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(mockUser);
      expect(mockUsersService.getUserById).toHaveBeenCalledWith('user-123');
      expect(app.logger.info).toHaveBeenCalledWith(`GET ${API_PATHS.userById} - get user by id`);
    });
  });

  describe('PATCH /api/users/:userId', () => {
    it('should update user by id', async () => {
      const userId = 'user-123';
      const updateData = { name: 'Updated Name' };
      const updatedUser = { id: userId, email: 'test@example.com', name: 'Updated Name' };

      (mockUsersService.updateUserById as jest.Mock).mockResolvedValue(updatedUser);

      const response = await request(app).patch(`/api/users/${userId}`).send(updateData);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(updatedUser);
      expect(mockUsersService.updateUserById).toHaveBeenCalledWith(userId, updateData);
      expect(app.logger.info).toHaveBeenCalledWith(`PATCH ${API_PATHS.userById} - updating user by ID`);
    });
  });

  describe('DELETE /api/users/:userId', () => {
    it('should delete user by id', async () => {
      const userId = 'user-123';
      const deleteResult = { success: true };

      (mockUsersService.deleteUserById as jest.Mock).mockResolvedValue(deleteResult);

      const response = await request(app).delete(`/api/users/${userId}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(deleteResult);
      expect(mockUsersService.deleteUserById).toHaveBeenCalledWith(userId);
      expect(app.logger.info).toHaveBeenCalledWith(`DELETE ${API_PATHS.userById} - delete user`);
    });
  });
});
