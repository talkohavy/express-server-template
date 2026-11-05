import type { KeyObject } from 'node:crypto';

/**
 * The P-256 curve, which ES256 requires. Must match `JWT_ALGORITHM` of the authentication module.
 */
const ES256_CURVE = 'prime256v1';

export function isEs256Key(key: KeyObject): boolean {
  return key.asymmetricKeyType === 'ec' && key.asymmetricKeyDetails?.namedCurve === ES256_CURVE;
}
