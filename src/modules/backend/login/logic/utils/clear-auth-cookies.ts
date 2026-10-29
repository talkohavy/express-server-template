import { buildCookieOptions } from './build-cookie-options';
import type { Response } from 'express';
import type { CookiesConfig } from '@src/plugins/config-service';

type ClearAuthCookiesProps = {
  res: Response;
  cookiesConfig: CookiesConfig;
};

export function clearAuthCookies(props: ClearAuthCookiesProps): void {
  const { res, cookiesConfig } = props;
  const { accessCookie, refreshCookie } = cookiesConfig;

  const accessCookieOptions = buildCookieOptions(accessCookie);
  const refreshCookieOptions = buildCookieOptions(refreshCookie);

  res.clearCookie(accessCookie.name, accessCookieOptions);
  res.clearCookie(refreshCookie.name, refreshCookieOptions);
}
