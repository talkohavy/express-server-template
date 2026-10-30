import { API_PATHS, StatusCodes } from '@src/common/constants';
import { BadRequestError, UnauthorizedError } from '@src/core/errors';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { ConfigKeys, type CookiesConfig } from '@src/plugins/config-service';
import { UserNotFoundError } from '../../../../users/logic/errors/user-not-found.error';
import { clearAuthCookies } from '../../logic/utils/clear-auth-cookies';
import { setAuthCookies } from '../../logic/utils/set-auth-cookies';
import { loginSchema } from './dto/login.dto';
import type { Application, Request, Response } from 'express';
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
    this.refresh();
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

        // Step 3: Start a new session (include role for RBAC)
        const tokens = await this.authAdapter.createTokens({ userId: user.id.toString(), role: user.role });

        // Step 4: Set cookies
        const cookiesConfig = this.app.configService.get<CookiesConfig>(ConfigKeys.Cookies);

        setAuthCookies({ res, tokens, cookiesConfig });

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

  /**
   * Swaps the refresh cookie for a fresh pair of cookies, continuing the same session.
   * The used refresh token can't be used again.
   *
   * Responds with 401 when the session can't continue (the client should send the user to log in).
   */
  private refresh() {
    this.app.post(API_PATHS.authRefresh, async (req: Request, res: Response) => {
      this.app.logger.info(`POST ${API_PATHS.authRefresh} - refresh the session`);

      const cookiesConfig = this.app.configService.get<CookiesConfig>(ConfigKeys.Cookies);

      const refreshToken: string | undefined = req.cookies?.[cookiesConfig.refreshCookie.name];

      if (!refreshToken) throw new UnauthorizedError('No refresh token provided');

      try {
        // Step 1: Use up the refresh token
        const { userId, session } = await this.authAdapter.consumeRefreshToken(refreshToken);

        // Step 2: Re-read the user, so a deleted user can't refresh, and a role change applies
        const user = await this.usersAdapter.getUserById(userId);

        // Step 3: Issue the session's next tokens
        const tokens = await this.authAdapter.createTokens({ userId, role: user.role, session });

        // Step 4: Set cookies
        setAuthCookies({ res, tokens, cookiesConfig });

        res.status(StatusCodes.NO_CONTENT).end();
      } catch (error) {
        /**
         * When using Direct Adapter, a missing user is thrown as a UserNotFoundError,
         * however, when using Http Adapter, it is thrown as a HttpException with status code 404.
         */
        const isUserGone = error instanceof UserNotFoundError || error.statusCode === StatusCodes.NOT_FOUND;
        const isSessionOver = isUserGone || error.statusCode === StatusCodes.UNAUTHORIZED;

        if (!isSessionOver) throw error;

        clearAuthCookies({ res, cookiesConfig });

        throw new UnauthorizedError('The session has ended, please log in again');
      }
    });
  }

  private logout() {
    this.app.post(API_PATHS.authLogout, async (req: Request, res: Response) => {
      this.app.logger.info(`POST ${API_PATHS.authLogout} - user logout`);

      const cookiesConfig = this.app.configService.get<CookiesConfig>(ConfigKeys.Cookies);

      const accessToken: string | undefined = req.cookies?.[cookiesConfig.accessCookie.name];

      /**
       * Closes the SSE connections of this login session only (the token's `sid`), on every node,
       * so they stop receiving events after logout. That covers every tab of this browser, since they share the cookie.
       * The user's other sessions (other devices or browsers) are untouched.
       */
      await this.closeSessionSseConnections(accessToken);

      clearAuthCookies({ res, cookiesConfig });

      res.json({});
    });
  }

  /**
   * Best effort: logout must succeed even if the token is already invalid or Redis is down.
   * (An expired token needs nothing here: its streams close on their own once it expires.)
   */
  private async closeSessionSseConnections(accessToken: string | undefined): Promise<void> {
    if (!accessToken) return;

    try {
      const { id: userId, sid: sessionId } = await this.authAdapter.verifyToken(accessToken);

      await this.app.sseTopics.closeSessionConnections({ userId, sessionId });
    } catch (error) {
      this.app.logger.warn('Failed to close the SSE connections of a logged-out user', { error });
    }
  }
}
