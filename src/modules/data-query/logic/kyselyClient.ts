import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from '../types';

/**
 * How long a single compiled widget query is allowed to run before Postgres kills it.
 * This is the hard backstop behind the cost estimator in logic/costEstimator.ts.
 */
const STATEMENT_TIMEOUT_MS = 5_000;

/**
 * Creates a Kysely instance backed by its own small connection pool.
 *
 * This is intentionally NOT `app.pg` (a single shared `pg.Client`, see
 * src/core/connections/postgres.connection.ts) because:
 * - Kysely's PostgresDialect requires pool semantics (`connect()` / `release()`).
 * - Batches of widget queries need to run concurrently, which a single Client can't do
 *   (it serializes every query on one connection).
 *
 * The pool is scoped to this module only and never touches shared plugin wiring.
 */
export function createDataQueryDbClient(connectionString: string): Kysely<Database> {
  const pool = new Pool({
    connectionString,
    max: 5,
    statement_timeout: STATEMENT_TIMEOUT_MS,
  });

  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
}
