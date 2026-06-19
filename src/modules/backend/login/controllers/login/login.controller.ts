import { API_PATHS, StatusCodes } from '@src/common/constants';
import { BadRequestError } from '@src/core/errors';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { ConfigKeys, type Config, type CookiesConfig } from '@src/plugins/config-service';
import { UserNotFoundError } from '../../../../users/logic/errors/user-not-found.error';
import { loginSchema } from './dto/loginSchema.dto';
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
        const { name: accessTokenCookieName, maxAge } = cookies.accessCookie;
        const { name: refreshTokenCookieName } = cookies.refreshCookie;

        const options: CookieOptions = {
          secure: !isDev,
          httpOnly: true,
          domain: isDev ? undefined : '.luckylove.co.il',
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
    this.app.post(API_PATHS.authLogout, async (_req, res) => {
      this.app.logger.info(`POST ${API_PATHS.authLogout} - user logout`);

      const { accessCookie, refreshCookie } = this.app.configService.get<CookiesConfig>(ConfigKeys.Cookies);

      res.clearCookie(accessCookie.name);
      res.clearCookie(refreshCookie.name);

      res.json({});
    });
  }
}
