import { randomUUID } from 'node:crypto';
import { RefreshTokenFields } from '@src/databases/postgres/models/refresh-token';
import { Tables } from '../../logic/constants';
import type { Kysely } from 'kysely';
import type { Database } from '@src/databases/postgres/types';
import type { CreateRefreshTokenProps, RefreshTokenDB } from './types';

export class RefreshTokensRepository {
  constructor(private readonly kysely: Kysely<Database>) {}

  async create(props: CreateRefreshTokenProps): Promise<RefreshTokenDB> {
    const { userId, familyId, tokenHash, expiresAt, sessionExpiresAt } = props;

    const refreshToken = await this.kysely
      .insertInto(Tables.RefreshTokens)
      .values({
        id: randomUUID(),
        user_id: userId,
        family_id: familyId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        session_expires_at: sessionExpiresAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return refreshToken;
  }

  /**
   * Revokes a live token and returns it, in a single statement.
   * If two requests present the same token at the same time, only one of them gets the row back.
   *
   * Returns `null` when the token is unknown, expired, or already revoked.
   */
  async consumeByHash(tokenHash: string): Promise<RefreshTokenDB | null> {
    const now = new Date();

    const refreshToken = await this.kysely
      .updateTable(Tables.RefreshTokens)
      .set({ revoked_at: now })
      .where(RefreshTokenFields.tokenHash, '=', tokenHash)
      .where(RefreshTokenFields.revokedAt, 'is', null)
      .where(RefreshTokenFields.expiresAt, '>', now)
      .returningAll()
      .executeTakeFirst();

    if (!refreshToken) return null;

    return refreshToken;
  }

  async getByHash(tokenHash: string): Promise<RefreshTokenDB | null> {
    const refreshToken = await this.kysely
      .selectFrom(Tables.RefreshTokens)
      .selectAll()
      .where(RefreshTokenFields.tokenHash, '=', tokenHash)
      .executeTakeFirst();

    if (!refreshToken) return null;

    return refreshToken;
  }

  /**
   * Revokes every live token of a login session.
   *
   * @returns how many tokens were revoked.
   */
  async revokeFamily(familyId: string): Promise<number> {
    const result = await this.kysely
      .updateTable(Tables.RefreshTokens)
      .set({ revoked_at: new Date() })
      .where(RefreshTokenFields.familyId, '=', familyId)
      .where(RefreshTokenFields.revokedAt, 'is', null)
      .executeTakeFirst();

    const revokedCount = Number(result.numUpdatedRows);

    return revokedCount;
  }
}
