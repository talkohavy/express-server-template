import type { Algorithm } from 'jsonwebtoken';

/**
 * Asymmetric: tokens are signed with the private key,
 * and verified with the public key alone.
 */
export const JWT_ALGORITHM: Algorithm = 'ES256';

export const Tables = {
  RefreshTokens: 'refresh_tokens',
} as const;
