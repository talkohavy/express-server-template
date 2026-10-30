import { createFeatureFlagsTable } from './feature-flags.migration';
import { createOrdersTable } from './orders.migration';
import { createProductsTable } from './products.migration';
import { createRefreshTokensTable } from './refresh-tokens.migration';
import { createUsersTable } from './users.migration';
import type { Client } from 'pg';

/**
 * Runs all database migrations to ensure tables exist.
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
 *
 * Order matters: `orders` has foreign keys into `users` and `products`, and `refresh_tokens` into `users`.
 */
export async function runAllMigrations(pgClient: Client): Promise<void> {
  console.log('📦 Running database migrations...');

  await createUsersTable(pgClient);
  console.log('  ✅ Users table ready');

  await createProductsTable(pgClient);
  console.log('  ✅ Products table ready');

  await createOrdersTable(pgClient);
  console.log('  ✅ Orders table ready');

  await createFeatureFlagsTable(pgClient);
  console.log('  ✅ Feature flags table ready');

  await createRefreshTokensTable(pgClient);
  console.log('  ✅ Refresh tokens table ready');

  console.log('✅ All migrations complete');
}
