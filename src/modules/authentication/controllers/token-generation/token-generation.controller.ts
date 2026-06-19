import { API_PATHS } from '@src/common/constants';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { createTokensSchema } from './dto/create-tokens.dto';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { TokenGenerationService } from '../../services/token-generation/token-generation.service';

export class TokenGenerationController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly tokenGenerationService: TokenGenerationService,
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

        const { userId, role } = body;

        const tokens = await this.tokenGenerationService.createTokens({ userId, role });

        res.json(tokens);
      },
    );
  }
}
