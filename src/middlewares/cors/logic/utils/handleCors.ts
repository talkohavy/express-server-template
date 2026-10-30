import { ALLOWED_DOMAINS, DOMAIN_REGEX } from '../constants';

/**
 * @description
 * Usage:
 * When an origin IS ALLOWED, the callback should be called like so:
 * callback(null, true)
 *
 * When an origin is NOT allowed, the callback should be called like so:
 * callback(new Error('Not allowed by CORS'))
 */
export function handleCors(isStrict: boolean): any {
  return (origin: string, callback: (err: Error | null, origin?: any) => void) => {
    const isAllowed =
      origin === undefined || ALLOWED_DOMAINS.includes(origin) || (!isStrict && origin.endsWith(DOMAIN_REGEX));

    if (isAllowed) return void callback(null, true);

    callback(new Error('CORS Not allowed'), false);
  };
}
