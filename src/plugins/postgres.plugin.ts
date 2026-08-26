import { PostgresConnection } from '@src/core/connections/postgres.connection';
import { runAllMigrations } from '../databases/postgres/migrations';
import { runAllSeeds } from '../databases/postgres/seeds';
import { ConfigKeys, type PostgresConfig } from './config-service';
import type { Application } from 'express';

/**
 * @dependencies
 * - config-service plugin
 */
export async function postgresPlugin(app: Application) {
  const { connectionString } = app.configService.get<PostgresConfig>(ConfigKeys.Postgres);

  const dbClient = PostgresConnection.getInstance(connectionString);

  await dbClient.connect();

  const pgClient = dbClient.getClient();

  app.pg = pgClient;

  // Run migrations and seeds
  if (process.env.SHOULD_MIGRATE_POSTGRES) {
    await runAllMigrations(pgClient);
    await runAllSeeds(pgClient, {
      users: { skipIfExists: false, clearBeforeSeeding: true },
      products: { skipIfExists: false, clearBeforeSeeding: true },
      orders: { skipIfExists: false, clearBeforeSeeding: true },
    });
  }
}
