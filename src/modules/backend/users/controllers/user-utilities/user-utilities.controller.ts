import { API_PATHS, StatusCodes } from '@src/common/constants';
import { ConfigKeys, type CookiesConfig } from '@src/plugins/config-service';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { IAuthAdapter } from '../../../login/adapters/auth.adapter.interface';
import type { IUsersAdapter } from '../../adapters/users.adapter.interface';

export class UserUtilitiesController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly usersAdapter: IUsersAdapter,
    private readonly authAdapter: IAuthAdapter,
  ) {}

  registerRoutes() {
    this.getProfile();
  }

  private getProfile() {
    this.app.get(API_PATHS.getProfile, async (req: Request, res: Response) => {
      const { cookies } = req;

      this.app.logger.info(`GET ${API_PATHS.getProfile} - get user profile`);

      const token = this.extractAccessTokenFromCookies(cookies);

      const decodedToken = await this.authAdapter.verifyToken(token);

      if (!decodedToken) return void res.status(StatusCodes.NO_CONTENT).json({}); // <--- silently fail

      const userId = decodedToken?.id;

      const fetchedUser = await this.usersAdapter.getUserById(userId);

      res.json(fetchedUser);
    });
  }

  private extractAccessTokenFromCookies(cookies: any) {
    const { accessCookie } = this.app.configService.get<CookiesConfig>(ConfigKeys.Cookies);
    return cookies[accessCookie.name];
  }
}
