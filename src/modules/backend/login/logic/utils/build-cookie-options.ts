import type { CookieOptions } from 'express';
import type { SingleCookie } from '@src/plugins/config-service';

/**
 * Shared by `setAuthCookies` and `clearAuthCookies`: a browser only deletes a cookie whose `path` and `domain`
 * match the ones it was set with, so both must build their options here.
 */
export function buildCookieOptions(cookieConfig: SingleCookie): CookieOptions {
  const { domain, path, isSecure } = cookieConfig;

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'strict',
    domain,
    path,
  };

  return cookieOptions;
}
