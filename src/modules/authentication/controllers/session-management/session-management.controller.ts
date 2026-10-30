import { API_PATHS } from '@src/common/constants';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { consumeRefreshTokenSchema } from './dto/consume-refresh-token.dto';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { SessionsService } from '../../services/sessions';

export class SessionManagementController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly sessionsService: SessionsService,
  ) {}

  registerRoutes() {
    this.consumeRefreshToken();
    this.logout();
  }

  private consumeRefreshToken() {
    this.app.post(
      API_PATHS.consumeRefreshToken,
      joiBodyMiddleware(consumeRefreshTokenSchema),
      async (req: Request, res: Response) => {
        const { body } = req;

        this.app.logger.info(`POST ${API_PATHS.consumeRefreshToken} - consume a refresh token`);

        const { refreshToken } = body;

        const consumedToken = await this.sessionsService.consumeRefreshToken(refreshToken);

        res.json(consumedToken);
      },
    );
  }

  private logout() {
    this.app.get(API_PATHS.authLogout, async (_req: Request, res: Response) => {
      this.app.logger.info(`GET ${API_PATHS.authLogout} - user logout`);

      // maybe blacklist token here

      res.json({});
    });
  }
}
