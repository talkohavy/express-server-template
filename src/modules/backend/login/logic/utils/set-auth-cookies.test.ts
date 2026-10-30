import { setAuthCookies } from './set-auth-cookies';
import type { Response } from 'express';
import type { CookiesConfig } from '@src/plugins/config-service';

describe('setAuthCookies', () => {
  const cookiesConfig: CookiesConfig = {
    accessCookie: { name: 'access_token', domain: '.example.com', path: '/', maxAge: 1000, isSecure: true },
    refreshCookie: { name: 'refresh_token', domain: '.example.com', path: '/api/auth', maxAge: 5000, isSecure: true },
  };
  const tokens = { accessToken: 'access-value', refreshToken: 'refresh-value' };

  let res: { cookie: jest.Mock };

  beforeEach(() => {
    res = { cookie: jest.fn() };
  });

  it('should set both cookies with their own path, domain and maxAge', () => {
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
