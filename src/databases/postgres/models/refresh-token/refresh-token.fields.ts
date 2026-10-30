export const RefreshTokenFields = {
  id: 'id',
  userId: 'user_id',
  familyId: 'family_id',
  tokenHash: 'token_hash',
  expiresAt: 'expires_at',
  sessionExpiresAt: 'session_expires_at',
  revokedAt: 'revoked_at',
  createdAt: 'created_at',
} as const;

export type RefreshTokenFieldValues = (typeof RefreshTokenFields)[keyof typeof RefreshTokenFields];
