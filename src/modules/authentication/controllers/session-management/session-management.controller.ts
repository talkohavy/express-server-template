import { API_PATHS } from '@src/common/constants';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { consumeRefreshTokenSchema } from './dto/consume-refresh-token.dto';
import { revokeSessionSchema } from './dto/revoke-session.dto';
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
    this.revokeSession();
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

  /**
   * Effectively acts as a logout endpoint.
   */
  private revokeSession() {
    this.app.post(
      API_PATHS.revokeSession,
      joiBodyMiddleware(revokeSessionSchema),
      async (req: Request, res: Response) => {
        const { body } = req;

        this.app.logger.info(`POST ${API_PATHS.revokeSession} - revoke a session`);

        const { refreshToken } = body;

        const revokedSession = await this.sessionsService.revokeSession(refreshToken);

        res.json(revokedSession);
      },
    );
  }
}
