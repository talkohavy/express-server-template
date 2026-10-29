import { API_PATHS, StatusCodes } from '@src/common/constants';
import { BadRequestError } from '@src/core/errors';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { ConfigKeys, type Config, type CookiesConfig } from '@src/plugins/config-service';
import { UserNotFoundError } from '../../../../users/logic/errors/user-not-found.error';
import { loginSchema } from './dto/login.dto';
import type { Application, CookieOptions, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { IUsersAdapter } from '../../../users/adapters/users.adapter.interface';
import type { IAuthAdapter } from '../../adapters/auth.adapter.interface';

export class LoginController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly authAdapter: IAuthAdapter,
    private readonly usersAdapter: IUsersAdapter,
  ) {}

  registerRoutes() {
    this.login();
    this.logout();
  }

  private login() {
    this.app.post(API_PATHS.authLogin, joiBodyMiddleware(loginSchema), async (req: Request, res: Response) => {
      const { body } = req;

      try {
        this.app.logger.info(`POST ${API_PATHS.authLogin} - user login endpoint`);

        const { email, password } = body;

        // Step 1: Get user by email
        const user = await this.usersAdapter.getUserByEmail(email);
        if (!user) {
          return void res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });
        }

        // Step 2: Validate password
        const isValid = await this.authAdapter.getIsPasswordValid(user.hashed_password, password);

        if (!isValid) {
          return void res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });
        }

        // Step 3: Generate tokens (include role for RBAC)
        const tokens = await this.authAdapter.createTokens(user.id.toString(), user.role);

        // Step 4: Set cookies
        const { cookies, isDev } = this.app.configService.get<Config>('');
        const { name: accessTokenCookieName, maxAge, domain } = cookies.accessCookie;
        const { name: refreshTokenCookieName } = cookies.refreshCookie;

        const options: CookieOptions = {
          secure: !isDev,
          httpOnly: true,
          domain: isDev ? undefined : domain,
          path: '/',
          maxAge,
          sameSite: 'strict',
        };

        res.cookie(accessTokenCookieName, tokens.accessToken, options);
        res.cookie(refreshTokenCookieName, tokens.refreshToken, options);

        res.json(user);
      } catch (error) {
        if (error instanceof UserNotFoundError) {
          this.app.logger.error('User not found:', error);
          throw new BadRequestError('invalid credentials');
        }

        throw error;
      }
    });
  }

  private logout() {
    this.app.post(API_PATHS.authLogout, async (req: Request, res: Response) => {
      this.app.logger.info(`POST ${API_PATHS.authLogout} - user logout`);

      const { accessCookie, refreshCookie } = this.app.configService.get<CookiesConfig>(ConfigKeys.Cookies);

      const accessToken: string | undefined = req.cookies?.[accessCookie.name];

      /**
       * Closes all of the user's open SSE connections, so they stop receiving events after logout.
       * Why all? because logout says "logout user 42", not "logout user 42's browser 1".
       * So we close all of the user's open SSE connections, so they stop receiving events after logout.
       * Other devices will reconnect on their own, with their still-valid cookies,
       * while the logged-out browser gets a 401 and stops.
       */
      await this.closeUserSseConnections(accessToken);

      res.clearCookie(accessCookie.name);
      res.clearCookie(refreshCookie.name);

      res.json({});
    });
  }

  /**
   * Best effort: logout must succeed even if the token is already invalid or Redis is down.
   * (An expired token needs nothing here: its streams close on their own once it expires.)
   */
  private async closeUserSseConnections(accessToken: string | undefined): Promise<void> {
    if (!accessToken) return;

    try {
      const { id: userId } = await this.authAdapter.verifyToken(accessToken);

      await this.app.sseTopics.closeUserConnections(userId);
    } catch (error) {
      this.app.logger.warn('Failed to close the SSE connections of a logged-out user', { error });
    }
  }
}
