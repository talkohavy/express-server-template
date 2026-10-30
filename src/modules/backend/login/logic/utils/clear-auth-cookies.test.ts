import { clearAuthCookies } from './clear-auth-cookies';
import type { Response } from 'express';
import type { CookiesConfig } from '@src/plugins/config-service';

describe('clearAuthCookies', () => {
  const cookiesConfig: CookiesConfig = {
    accessCookie: { name: 'access_token', domain: '.example.com', path: '/', isSecure: true },
    refreshCookie: { name: 'refresh_token', domain: '.example.com', path: '/api/auth', isSecure: true },
  };

  let res: { clearCookie: jest.Mock };

  beforeEach(() => {
    res = { clearCookie: jest.fn() };
  });

  it('should clear both cookies with the same path and domain they were set with', () => {
    const expectedResult = [
      ['access_token', { httpOnly: true, secure: true, sameSite: 'strict', domain: '.example.com', path: '/' }],
      [
        'refresh_token',
        { httpOnly: true, secure: true, sameSite: 'strict', domain: '.example.com', path: '/api/auth' },
      ],
    ];

    clearAuthCookies({ res: res as unknown as Response, cookiesConfig });

    const actualResult = res.clearCookie.mock.calls;
    expect(actualResult).toEqual(expectedResult);
  });
});
