import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from '@src/modules/data-query/types';

/**
 * How long a single compiled query is allowed to run before Postgres kills it.
 * This is the hard backstop behind the cost estimator in the data-query module.
 */
const STATEMENT_TIMEOUT_MS = 5_000;
const POOL_MAX_CONNECTIONS = 5;

export function createKyselyClient(props: { connectionString: string }): Kysely<Database> {
  const { connectionString } = props;

  const pool = new Pool({
    connectionString,
    max: POOL_MAX_CONNECTIONS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
  });

  const dialect = new PostgresDialect({ pool });

  const kyselyClient = new Kysely<Database>({ dialect });

  return kyselyClient;
}
