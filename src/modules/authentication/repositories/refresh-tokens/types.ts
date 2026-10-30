import type { Selectable } from 'kysely';
import type { RefreshTokensTable } from '@src/databases/postgres/types';

export type RefreshTokenDB = Selectable<RefreshTokensTable>;

export type CreateRefreshTokenProps = {
  userId: number;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  sessionExpiresAt: Date;
};
