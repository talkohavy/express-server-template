import type { RoleTypeValues } from '@src/common/constants';

export type DatabaseUser = {
  /**
   * Store-local identifier, kept as a string so it can hold BOTH a Postgres numeric
   * id (stringified) AND a Mongo ObjectId hex string during the migration.
   *
   * IMPORTANT: this id is NOT stable across stores — the same logical user has a
   * DIFFERENT id in Mongo vs Postgres. The stable cross-store identity is `email`.
   * Never join, reconcile, or shadow-compare two users by `id`; join by `email`.
   */
  id: string;
  email: string;
  nickname: string;
  hashed_password: string;
  date_of_birth: number;
  role: RoleTypeValues;
};
