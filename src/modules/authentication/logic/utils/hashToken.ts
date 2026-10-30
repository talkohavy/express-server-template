import { createHash } from 'node:crypto';

/**
 * Refresh tokens are long random strings, so a fast unsalted SHA-256 is enough (unlike passwords).
 * Being deterministic is what lets the DB look a token up by its hash.
 */
export function hashToken(token: string): string {
  const tokenHash = createHash('sha256').update(token).digest('hex');

  return tokenHash;
}
