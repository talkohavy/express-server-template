import { API_PATHS, StatusCodes } from '@src/common/constants';
import { Permissions } from '@src/common/constants/permissions';
import { BadRequestError } from '@src/core/errors';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { requirePermissionMiddleware } from '@src/middlewares/require-permission.middleware';
import { requireUserAuthMiddleware } from '@src/middlewares/require-user-auth.middleware';
import { UserAlreadyExistsError } from '../../../../users/logic/errors/user-already-exists.error';
import { createUserSchema } from './dto/createUserSchema.dto';
import { updateUserSchema } from './dto/updateUserSchema.dto';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { IUsersAdapter } from '../../adapters/users.adapter.interface';

export class UsersCrudController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly usersAdapter: IUsersAdapter,
  ) {}

  registerRoutes() {
    this.createUser();
    this.getUsers();
    this.getUserById();
    this.updateUser();
    this.deleteUser();
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

          const createdUser = await this.usersAdapter.createUser(body);

          res.status(StatusCodes.CREATED).json(createdUser);
        } catch (error) {
          /**
           * When using Direct Adapter, the thrown error is as a UserAlreadyExistsError,
           * however, when using Http Adapter, the error is thrown as a HttpException with status code 409.
           */
          if (error instanceof UserAlreadyExistsError || error.statusCode === StatusCodes.CONFLICT) {
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

        const users = await this.usersAdapter.getUsers(query);

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

        const userId = params.userId! as string;

        this.app.logger.info(`GET ${API_PATHS.userById} - get user by id`);

        const fetchedUser = await this.usersAdapter.getUserById(userId);

        res.json(fetchedUser);
      },
    );
  }

  private updateUser() {
    this.app.patch(
      API_PATHS.userById,
      requireUserAuthMiddleware,
      requirePermissionMiddleware([Permissions.users.update]),
      joiBodyMiddleware(updateUserSchema),
      async (req: Request, res: Response) => {
        const { body, params } = req;

        this.app.logger.info(`PATCH ${API_PATHS.userById} - updating user by ID`);

        const userId = params.userId!;
        const updatedUser = await this.usersAdapter.updateUserById(userId, body);

        res.json(updatedUser);
      },
    );
  }

  private deleteUser() {
    this.app.delete(
      API_PATHS.userById,
      requireUserAuthMiddleware,
      requirePermissionMiddleware([Permissions.users.delete]),
      async (req: Request, res: Response) => {
        const { params } = req;

        const id = params.userId!;

        this.app.logger.info(`DELETE ${API_PATHS.userById} - delete user`);

        const result = await this.usersAdapter.deleteUserById(id);

        res.json(result);
      },
    );
  }
}
