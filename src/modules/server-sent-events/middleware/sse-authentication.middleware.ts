import { API_PATHS } from '@src/common/constants';
import { UnauthorizedError } from '@src/core/errors';
import { ConfigKeys, type CookiesConfig } from '@src/plugins/config-service';
import type { Application, NextFunction, Request, Response } from 'express';
import type { UserToken } from '@src/common/types';
import type { MiddlewareFactory } from '@src/lib/lucky-server';
import type { TokenVerificationService } from '../../authentication/services/token-verification';

export class SseAuthenticationMiddleware implements MiddlewareFactory {
  constructor(
    private readonly app: Application,
    private readonly tokenVerificationService: TokenVerificationService,
  ) {}

  use() {
    this.app.use(API_PATHS.sse, this.authenticate.bind(this));
  }

  private async authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const { accessCookie } = this.app.configService.get<CookiesConfig>(ConfigKeys.Cookies);

    const accessToken: string | undefined = req.cookies?.[accessCookie.name];

    if (!accessToken) throw new UnauthorizedError('Missing access token');

    const user = (await this.tokenVerificationService.verifyToken(accessToken).catch(() => null)) as UserToken | null;

    if (!user) throw new UnauthorizedError('Invalid access token');

    req.user = user;

    next();
  }
}
