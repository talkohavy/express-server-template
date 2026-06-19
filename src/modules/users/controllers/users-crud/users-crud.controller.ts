import { API_PATHS, StatusCodes } from '@src/common/constants';
import { Permissions } from '@src/common/constants/permissions';
import { BadRequestError } from '@src/core/errors';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { requirePermissionMiddleware } from '@src/middlewares/require-permission.middleware';
import { UserAlreadyExistsError } from '@src/modules/users/logic/errors/user-already-exists.error';
import { createUserSchema } from './dto/createUserSchema.dto';
import { updateUserSchema } from './dto/updateUserSchema.dto';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { UsersCrudService } from '../../services/users-crud/users-crud.service';

export class UsersCrudController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly usersService: UsersCrudService,
  ) {}

  registerRoutes() {
    this.createUser();
    this.getUsers();
    this.getUserById();
    this.updateUserById();
    this.deleteUserById();
  }

  private createUser() {
    this.app.post(
      API_PATHS.users,
      requirePermissionMiddleware([Permissions.users.create]),
      joiBodyMiddleware(createUserSchema),
      async (req: Request, res: Response) => {
        try {
          const { body } = req;

          this.app.logger.info(`POST ${API_PATHS.users} - create new user`);

          const createdUser = await this.usersService.createUser(body);

          res.status(StatusCodes.CREATED).json(createdUser);
        } catch (error) {
          if (error instanceof UserAlreadyExistsError) {
            throw new BadRequestError(error.message, { statusCode: StatusCodes.CONFLICT });
          }

          throw error;
        }
      },
    );
  }

  private getUsers() {
    this.app.get(
      API_PATHS.users,
      requirePermissionMiddleware([Permissions.users.read]),
      async (req: Request, res: Response) => {
        const { query } = req;

        this.app.logger.info(`GET ${API_PATHS.users} - get all users`);

        const users = await this.usersService.getUsers(query);

        res.json(users);
      },
    );
  }

  private getUserById() {
    this.app.get(
      API_PATHS.userById,
      requirePermissionMiddleware([Permissions.users.read]),
      async (req: Request, res: Response) => {
        const { params } = req;

        const id = params.userId! as string;

        this.app.logger.info(`GET ${API_PATHS.userById} - get user by id`);

        const fetchedUser = await this.usersService.getUserById(id);

        res.json(fetchedUser);
      },
    );
  }

  private updateUserById() {
    this.app.patch(
      API_PATHS.userById,
      requirePermissionMiddleware([Permissions.users.update]),
      joiBodyMiddleware(updateUserSchema),
      async (req: Request, res: Response) => {
        const { body, params } = req;

        this.app.logger.info(`PATCH ${API_PATHS.userById} - updating user by ID`);

        const userId = params.userId!;

        const updatedUser = await this.usersService.updateUserById(userId, body);

        res.json(updatedUser);
      },
    );
  }

  private deleteUserById() {
    this.app.delete(
      API_PATHS.userById,
      requirePermissionMiddleware([Permissions.users.delete]),
      async (req: Request, res: Response) => {
        const { params } = req;

        const userId = params.userId!;

        this.app.logger.info(`DELETE ${API_PATHS.userById} - delete user`);

        const result = await this.usersService.deleteUserById(userId);

        res.json(result);
      },
    );
  }
}
