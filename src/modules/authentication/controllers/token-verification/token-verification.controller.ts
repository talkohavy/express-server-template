import { API_PATHS } from '@src/common/constants';
import { UnauthorizedError } from '@src/core/errors';
import { ConfigKeys, type CookiesConfig } from '@src/plugins/config-service';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { TokenVerificationService } from '../../services/token-verification/token-verification.service';

export class TokenVerificationController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly tokenVerificationService: TokenVerificationService,
  ) {}

  registerRoutes() {
    this.verifyToken();
  }

  private verifyToken() {
    this.app.get(API_PATHS.verifyToken, async (req: Request, res: Response) => {
      const { cookies } = req;

      this.app.logger.info(`GET ${API_PATHS.verifyToken} - verify tokens`);

      const encodedToken = this.extractAccessTokenFromCookies(cookies);

      if (!encodedToken) {
        this.app.logger.error('No token found in cookies');
        throw new UnauthorizedError('No token provided');
      }

      const decodedToken = await this.tokenVerificationService.verifyToken(encodedToken);

      res.json(decodedToken);
    });
  }

  private extractAccessTokenFromCookies(cookies: any): string {
    const { accessCookie } = this.app.configService.get<CookiesConfig>(ConfigKeys.Cookies);
    const token = cookies[accessCookie.name] as string;

    return token;
  }
}
