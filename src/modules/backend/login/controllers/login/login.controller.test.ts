import cookieParser from 'cookie-parser';
import express, { type Application } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { InternalServerError, NotFoundError, UnauthorizedError } from '@src/core/errors';
import { errorHandler } from '@src/middlewares/errorHandler.middleware';
import { UserNotFoundError } from '../../../../users/logic/errors/user-not-found.error';
import { LoginController } from './login.controller';
import type { CookiesConfig } from '@src/plugins/config-service';
import type { IUsersAdapter } from '../../../users/adapters/users.adapter.interface';
import type { IAuthAdapter } from '../../adapters/auth.adapter.interface';

describe('LoginController', () => {
  const now = new Date('2026-01-01T00:00:00.000Z').getTime();
  const cookiesConfig: CookiesConfig = {
    accessCookie: { name: 'access_token', path: '/', isSecure: false },
    refreshCookie: { name: 'refresh_token', path: '/api/auth', isSecure: false },
  };
  const session = { id: 'session-id', expiresAt: now + 20_000 };
  const tokens = {
    accessToken: 'new-access-token',
    accessTokenExpiresAt: now + 1000,
    refreshToken: 'new-refresh-token',
    refreshTokenExpiresAt: now + 5000,
  };

  let app: Application;
  let authAdapter: { consumeRefreshToken: jest.Mock; createTokens: jest.Mock };
  let usersAdapter: { getUserById: jest.Mock };

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    app = express() as unknown as Application;
    app.use(express.json());
    app.use(cookieParser());

    app.logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() } as any;
    app.configService = { get: jest.fn().mockReturnValue(cookiesConfig) } as any;

    authAdapter = {
      consumeRefreshToken: jest.fn().mockResolvedValue({ userId: '7', session }),
      createTokens: jest.fn().mockResolvedValue(tokens),
    };
    usersAdapter = { getUserById: jest.fn().mockResolvedValue({ id: 7, role: 'admin' }) };

    const controller = new LoginController(
      app,
      authAdapter as unknown as IAuthAdapter,
      usersAdapter as unknown as IUsersAdapter,
    );
    controller.registerRoutes();
    errorHandler(app);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/auth/refresh', () => {
    function postRefresh() {
      return request(app).post(API_PATHS.authRefresh).set('Cookie', ['refresh_token=old-refresh-token']);
    }

    function getSetCookieHeaders(response: request.Response): Array<string> {
      const setCookieHeaders = response.headers['set-cookie'] as unknown as Array<string> | undefined;

      return setCookieHeaders ?? [];
    }

    describe('with a valid refresh token', () => {
      it('should respond with 204', async () => {
        const response = await postRefresh();

        expect(response.status).toBe(StatusCodes.NO_CONTENT);
      });

      it('should consume the refresh token from the cookie', async () => {
        await postRefresh();

        expect(authAdapter.consumeRefreshToken).toHaveBeenCalledWith('old-refresh-token');
      });

      it('should continue the same session with the role read again from the user', async () => {
        const expectedResult = { userId: '7', role: 'admin', session };

        await postRefresh();

        const actualResult = authAdapter.createTokens.mock.calls[0][0];
        expect(actualResult).toEqual(expectedResult);
      });

      it('should set both cookies to the new tokens', async () => {
        const expectedResult = [
          expect.stringContaining('access_token=new-access-token'),
          expect.stringContaining('refresh_token=new-refresh-token'),
        ];

        const response = await postRefresh();

        const actualResult = getSetCookieHeaders(response);
        expect(actualResult).toEqual(expectedResult);
      });
    });

    describe('without a refresh cookie', () => {
      it('should respond with 401 without consuming anything', async () => {
        const response = await request(app).post(API_PATHS.authRefresh);

        expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
        expect(authAdapter.consumeRefreshToken).not.toHaveBeenCalled();
      });
    });

    describe.each([
      { case: 'the refresh token cannot be consumed', mock: 'consume', error: new UnauthorizedError() },
      { case: 'the user was deleted (direct adapter)', mock: 'user', error: new UserNotFoundError('7') },
      { case: 'the user was deleted (http adapter)', mock: 'user', error: new NotFoundError() },
    ])('when $case', ({ mock, error }) => {
      beforeEach(() => {
        const failingMock = mock === 'consume' ? authAdapter.consumeRefreshToken : usersAdapter.getUserById;
        failingMock.mockRejectedValue(error);
      });

      it('should respond with 401', async () => {
        const response = await postRefresh();

        expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      });

      it('should clear both cookies', async () => {
        const expectedResult = [
          expect.stringMatching(/^access_token=;.*Expires=Thu, 01 Jan 1970/),
          expect.stringMatching(/^refresh_token=;.*Expires=Thu, 01 Jan 1970/),
        ];

        const response = await postRefresh();

        const actualResult = getSetCookieHeaders(response);
        expect(actualResult).toEqual(expectedResult);
      });

      it('should not issue new tokens', async () => {
        await postRefresh();

        expect(authAdapter.createTokens).not.toHaveBeenCalled();
      });
    });

    describe('when the auth service fails before consuming the token', () => {
      beforeEach(() => {
        authAdapter.consumeRefreshToken.mockRejectedValue(new InternalServerError());
      });

      it('should respond with 500', async () => {
        const response = await postRefresh();

        expect(response.status).toBe(StatusCodes.INTERNAL_ERROR);
      });

      it('should keep the cookies, so the client can try again', async () => {
        const response = await postRefresh();

        const actualResult = getSetCookieHeaders(response);
        expect(actualResult).toEqual([]);
      });
    });
  });
});
