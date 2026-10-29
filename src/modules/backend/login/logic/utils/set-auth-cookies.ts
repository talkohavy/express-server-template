import { buildCookieOptions } from './build-cookie-options';
import type { Response } from 'express';
import type { CookiesConfig } from '@src/plugins/config-service';
import type { Tokens } from '../../adapters/auth.adapter.interface';

type SetAuthCookiesProps = {
  res: Response;
  tokens: Tokens;
  cookiesConfig: CookiesConfig;
};

export function setAuthCookies(props: SetAuthCookiesProps): void {
  const { res, tokens, cookiesConfig } = props;
  const { accessCookie, refreshCookie } = cookiesConfig;

  const accessCookieOptions = buildCookieOptions(accessCookie);
  const refreshCookieOptions = buildCookieOptions(refreshCookie);

  res.cookie(accessCookie.name, tokens.accessToken, { ...accessCookieOptions, maxAge: accessCookie.maxAge });
  res.cookie(refreshCookie.name, tokens.refreshToken, { ...refreshCookieOptions, maxAge: refreshCookie.maxAge });
}
