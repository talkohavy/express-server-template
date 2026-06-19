import { API_PATHS } from '@src/common/constants';
import { UnauthorizedError } from '@src/core/errors';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { getIsPasswordValidSchema } from './dto/get-is-password-valid.dto';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { PasswordManagementService } from '../../services/password-management/password-management.service';

export class PasswordManagementController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly passwordManagementService: PasswordManagementService,
  ) {}

  registerRoutes() {
    this.getIsPasswordValid();
  }

  private getIsPasswordValid() {
    this.app.post(
      API_PATHS.isPasswordValid,
      joiBodyMiddleware(getIsPasswordValidSchema),
      async (req: Request, res: Response) => {
        try {
          const { body } = req;

          this.app.logger.info(`POST ${API_PATHS.isPasswordValid} - check if password is valid`);

          const { hashedPassword: saltAndHashedPassword, password } = body;

          const isValid = await this.passwordManagementService.getIsPasswordValid(saltAndHashedPassword, password);

          res.json({ isValid });
        } catch (error) {
          this.app.logger.error('Check password validity failed...', { error });

          throw new UnauthorizedError('Invalid credentials');
        }
      },
    );
  }
}
