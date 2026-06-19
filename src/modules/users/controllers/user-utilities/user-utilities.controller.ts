import { API_PATHS } from '@src/common/constants';
import { NotFoundError } from '@src/core/errors';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { UserNotFoundError } from '../../logic/errors/user-not-found.error';
import { getUserByEmailSchema } from './dto/get-user-by-email.dto';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { UserUtilitiesService } from '../../services/user-utilities.service';

export class UserUtilitiesController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly userUtilitiesService: UserUtilitiesService,
  ) {}

  registerRoutes() {
    this.getUserByEmail();
  }

  private getUserByEmail() {
    this.app.post(
      API_PATHS.getUserByEmail,
      joiBodyMiddleware(getUserByEmailSchema),
      async (req: Request, res: Response) => {
        try {
          const { body } = req;

          this.app.logger.info('POST /users/get-by-email - fetching user by email');

          const email = body.email!;
          const user = await this.userUtilitiesService.getUserByEmail(email);

          res.json(user);
        } catch (error) {
          if (error instanceof UserNotFoundError) {
            throw new NotFoundError(error.message);
          }

          throw error;
        }
      },
    );
  }
}
