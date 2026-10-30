import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type CompiledQuery,
  type DatabaseConnection,
  type QueryResult,
} from 'kysely';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import type { Database } from '@src/databases/postgres/types';
import type { RefreshTokenDB } from './types';

jest.mock('node:crypto', () => ({
  ...jest.requireActual('node:crypto'),
  randomUUID: jest.fn(() => 'generated-id'),
}));

type QueryRecorder = {
  queries: Array<CompiledQuery>;
  result: QueryResult<any>;
};

/**
 * A real Kysely instance that compiles Postgres SQL, but never touches a database:
 * it records every compiled query and answers with `recorder.result`.
 */
function createRecordingKysely(recorder: QueryRecorder): Kysely<Database> {
  class RecordingDriver extends DummyDriver {
    async acquireConnection(): Promise<DatabaseConnection> {
      const connection: DatabaseConnection = {
        async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
          recorder.queries.push(compiledQuery);

          return recorder.result as QueryResult<R>;
        },
        async *streamQuery() {},
      };

      return connection;
    }
  }

  const kysely = new Kysely<Database>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new RecordingDriver(),
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  });

  return kysely;
}

describe('RefreshTokensRepository', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const expiresAt = new Date('2026-01-08T00:00:00.000Z');
  const sessionExpiresAt = new Date('2026-01-31T00:00:00.000Z');

  const storedRefreshToken: RefreshTokenDB = {
    id: 'generated-id',
    user_id: 7,
    family_id: 'family-1',
    token_hash: 'hash-1',
    expires_at: expiresAt,
    session_expires_at: sessionExpiresAt,
    revoked_at: null,
    created_at: now,
  };

  let recorder: QueryRecorder;
  let repository: RefreshTokensRepository;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);

    recorder = { queries: [], result: { rows: [] } };
    repository = new RefreshTokensRepository(createRecordingKysely(recorder));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('should insert the token with a generated id', async () => {
      recorder.result = { rows: [storedRefreshToken] };
      const expectedResult = {
        sql: 'insert into "refresh_tokens" ("id", "user_id", "family_id", "token_hash", "expires_at", "session_expires_at") values ($1, $2, $3, $4, $5, $6) returning *',
        parameters: ['generated-id', 7, 'family-1', 'hash-1', expiresAt, sessionExpiresAt],
      };

      await repository.create({ userId: 7, familyId: 'family-1', tokenHash: 'hash-1', expiresAt, sessionExpiresAt });

      const { sql, parameters } = recorder.queries[0]!;
      const actualResult = { sql, parameters };
      expect(actualResult).toEqual(expectedResult);
    });

    it('should return the inserted row', async () => {
      recorder.result = { rows: [storedRefreshToken] };

      const actualResult = await repository.create({
        userId: 7,
        familyId: 'family-1',
        tokenHash: 'hash-1',
        expiresAt,
        sessionExpiresAt,
      });

      expect(actualResult).toEqual(storedRefreshToken);
    });
  });

  describe('consumeByHash', () => {
    it('should revoke the token only if it is not revoked and not expired, in one statement', async () => {
      const expectedResult = {
        sql: 'update "refresh_tokens" set "revoked_at" = $1 where "token_hash" = $2 and "revoked_at" is null and "expires_at" > $3 returning *',
        parameters: [now, 'hash-1', now],
      };

      await repository.consumeByHash('hash-1');

      const { sql, parameters } = recorder.queries[0]!;
      const actualResult = { sql, parameters };
      expect(actualResult).toEqual(expectedResult);
    });

    it('should return the consumed row', async () => {
      const consumedRefreshToken = { ...storedRefreshToken, revoked_at: now };
      recorder.result = { rows: [consumedRefreshToken] };

      const actualResult = await repository.consumeByHash('hash-1');

      expect(actualResult).toEqual(consumedRefreshToken);
    });

    it('should return null when no live token matches', async () => {
      const actualResult = await repository.consumeByHash('hash-1');

      expect(actualResult).toBeNull();
    });
  });

  describe('getByHash', () => {
    it('should select the token by its hash, revoked or not', async () => {
      const expectedResult = {
        sql: 'select * from "refresh_tokens" where "token_hash" = $1',
        parameters: ['hash-1'],
      };

      await repository.getByHash('hash-1');

      const { sql, parameters } = recorder.queries[0]!;
      const actualResult = { sql, parameters };
      expect(actualResult).toEqual(expectedResult);
    });

    it('should return the row', async () => {
      recorder.result = { rows: [storedRefreshToken] };

      const actualResult = await repository.getByHash('hash-1');

      expect(actualResult).toEqual(storedRefreshToken);
    });

    it('should return null when the hash is unknown', async () => {
      const actualResult = await repository.getByHash('unknown-hash');

      expect(actualResult).toBeNull();
    });
  });

  describe('revokeFamily', () => {
    it('should revoke every live token of the family', async () => {
      recorder.result = { rows: [], numAffectedRows: BigInt(0) };
      const expectedResult = {
        sql: 'update "refresh_tokens" set "revoked_at" = $1 where "family_id" = $2 and "revoked_at" is null',
        parameters: [now, 'family-1'],
      };

      await repository.revokeFamily('family-1');

      const { sql, parameters } = recorder.queries[0]!;
      const actualResult = { sql, parameters };
      expect(actualResult).toEqual(expectedResult);
    });

    it('should return how many tokens were revoked', async () => {
      recorder.result = { rows: [], numAffectedRows: BigInt(2) };

      const actualResult = await repository.revokeFamily('family-1');

      expect(actualResult).toBe(2);
    });
  });
});
