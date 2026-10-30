import { API_PATHS } from '@src/common/constants';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { createTokensSchema } from './dto/create-tokens.dto';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { SessionsService } from '../../services/sessions';

export class TokenGenerationController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly sessionsService: SessionsService,
  ) {}

  registerRoutes() {
    this.createTokens();
  }

  private createTokens() {
    this.app.post(
      API_PATHS.createTokens,
      joiBodyMiddleware(createTokensSchema),
      async (req: Request, res: Response) => {
        const { body } = req;

        this.app.logger.info(`POST ${API_PATHS.createTokens} - create tokens`);

        const { userId, role, session } = body;

        const tokens = await this.sessionsService.createTokens({ userId, role, session });

        res.json(tokens);
      },
    );
  }
}
