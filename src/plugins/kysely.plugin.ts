import { createKyselyClient } from '@src/core/connections/kysely.connection';
import { ConfigKeys, type PostgresConfig } from './config-service';
import type { Application } from 'express';

/**
 * @dependencies
 * - config-service plugin
 */
export function kyselyPlugin(app: Application) {
  const { connectionString } = app.configService.get<PostgresConfig>(ConfigKeys.Postgres);

  const kyselyClient = createKyselyClient({ connectionString });

  app.kysely = kyselyClient;
}
