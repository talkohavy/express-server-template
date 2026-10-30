import { setAuthCookies } from './set-auth-cookies';
import type { Response } from 'express';
import type { CookiesConfig } from '@src/plugins/config-service';

describe('setAuthCookies', () => {
  const now = new Date('2026-01-01T00:00:00.000Z').getTime();
  const cookiesConfig: CookiesConfig = {
    accessCookie: { name: 'access_token', domain: '.example.com', path: '/', isSecure: true },
    refreshCookie: { name: 'refresh_token', domain: '.example.com', path: '/api/auth', isSecure: true },
  };
  const tokens = {
    accessToken: 'access-value',
    accessTokenExpiresAt: now + 1000,
    refreshToken: 'refresh-value',
    refreshTokenExpiresAt: now + 5000,
  };

  let res: { cookie: jest.Mock };

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);

    res = { cookie: jest.fn() };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should set both cookies with their own path and domain, each living as long as its token', () => {
    const expectedResult = [
      [
        'access_token',
        'access-value',
        { httpOnly: true, secure: true, sameSite: 'strict', domain: '.example.com', path: '/', maxAge: 1000 },
      ],
      [
        'refresh_token',
        'refresh-value',
        {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          domain: '.example.com',
          path: '/api/auth',
          maxAge: 5000,
        },
      ],
    ];

    setAuthCookies({ res: res as unknown as Response, tokens, cookiesConfig });

    const actualResult = res.cookie.mock.calls;
    expect(actualResult).toEqual(expectedResult);
  });

  it('should leave the domain out and the secure flag off when configured so', () => {
    const expectedResult = {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      domain: undefined,
      path: '/',
      maxAge: 1000,
    };
    const hostOnlyInsecureConfig: CookiesConfig = {
      accessCookie: { ...cookiesConfig.accessCookie, domain: undefined, isSecure: false },
      refreshCookie: { ...cookiesConfig.refreshCookie, domain: undefined, isSecure: false },
    };

    setAuthCookies({ res: res as unknown as Response, tokens, cookiesConfig: hostOnlyInsecureConfig });

    const actualResult = res.cookie.mock.calls[0][2];
    expect(actualResult).toEqual(expectedResult);
  });
});
