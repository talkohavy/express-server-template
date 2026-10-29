import { setAuthCookies } from './set-auth-cookies';
import type { Response } from 'express';
import type { CookiesConfig } from '@src/plugins/config-service';

describe('setAuthCookies', () => {
  const cookiesConfig: CookiesConfig = {
    accessCookie: { name: 'access_token', domain: '.example.com', path: '/', maxAge: 1000 },
    refreshCookie: { name: 'refresh_token', domain: '.example.com', path: '/api/auth', maxAge: 5000 },
  };
  const tokens = { accessToken: 'access-value', refreshToken: 'refresh-value' };

  let res: { cookie: jest.Mock };

  beforeEach(() => {
    res = { cookie: jest.fn() };
  });

  it('should set both cookies with their own path and maxAge, and the domain outside dev', () => {
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

    setAuthCookies({ res: res as unknown as Response, tokens, cookiesConfig, isDev: false });

    const actualResult = res.cookie.mock.calls;
    expect(actualResult).toEqual(expectedResult);
  });

  it('should drop the domain and the secure flag in dev', () => {
    const expectedResult = {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      domain: undefined,
      path: '/',
      maxAge: 1000,
    };

    setAuthCookies({ res: res as unknown as Response, tokens, cookiesConfig, isDev: true });

    const actualResult = res.cookie.mock.calls[0][2];
    expect(actualResult).toEqual(expectedResult);
  });
});
