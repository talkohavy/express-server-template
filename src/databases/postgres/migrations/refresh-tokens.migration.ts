import type { Client } from 'pg';

export const REFRESH_TOKENS_TABLE_NAME = 'refresh_tokens';

/**
 * - `family_id` groups every token rotated from one login. It is also the access token's `sid`.
 * - `token_hash` is the SHA-256 of the raw token. The raw token itself is never stored.
 * - `expires_at` is this token's own (idle) lifetime; `session_expires_at` is the absolute limit of the whole family.
 * - A revoked row is kept until it expires: presenting it again is how a stolen token gets detected.
 */
export const refreshTokensTableSchema = `
  CREATE TABLE IF NOT EXISTS public.${REFRESH_TOKENS_TABLE_NAME}
  (
    id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    session_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS ${REFRESH_TOKENS_TABLE_NAME}_family_id_idx ON public.${REFRESH_TOKENS_TABLE_NAME} (family_id);
`;

export async function createRefreshTokensTable(pgClient: Client): Promise<void> {
  await pgClient.query(refreshTokensTableSchema);
}
