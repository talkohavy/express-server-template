import { buildCookieOptions } from './build-cookie-options';
import type { Response } from 'express';
import type { CookiesConfig } from '@src/plugins/config-service';
import type { Tokens } from '../../adapters/auth.adapter.interface';

type SetAuthCookiesProps = {
  res: Response;
  tokens: Tokens;
  cookiesConfig: CookiesConfig;
};

/**
 * Each cookie lives exactly as long as the token inside it.
 * `maxAge` (relative) rather than `expires` (absolute), so a skewed client clock can't shorten or extend it.
 */
export function setAuthCookies(props: SetAuthCookiesProps): void {
  const { res, tokens, cookiesConfig } = props;
  const { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt } = tokens;
  const { accessCookie, refreshCookie } = cookiesConfig;

  const now = Date.now();
  const accessCookieOptions = buildCookieOptions(accessCookie);
  const refreshCookieOptions = buildCookieOptions(refreshCookie);

  res.cookie(accessCookie.name, accessToken, { ...accessCookieOptions, maxAge: accessTokenExpiresAt - now });
  res.cookie(refreshCookie.name, refreshToken, { ...refreshCookieOptions, maxAge: refreshTokenExpiresAt - now });
}
