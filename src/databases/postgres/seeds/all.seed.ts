import { clearOrders, seedOrders, type SeedOrdersOptions } from './orders.seed';
import { seedProducts, type SeedProductsOptions } from './products.seed';
import { seedUsers, type SeedUsersOptions } from './users.seed';
import type { Client } from 'pg';

export type RunAllSeedsOptions = {
  users?: SeedUsersOptions;
  products?: SeedProductsOptions;
  orders?: SeedOrdersOptions;
};

/**
 * Runs all database seeds.
 * Call this on server startup to ensure seed data exists.
 *
 * Order matters: `orders` seeding depends on `users` and `products` already existing.
 * For the same reason, `orders` must be *cleared* before `users`/`products` are
 * cleared, otherwise deleting a referenced user/product violates its foreign
 * key constraints.
 */
export async function runAllSeeds(pgClient: Client, options: RunAllSeedsOptions = {}): Promise<void> {
  console.log('🌱 Starting database seeding...');

  const shouldClearOrdersFirst = Boolean(
    options.orders?.clearBeforeSeeding || options.users?.clearBeforeSeeding || options.products?.clearBeforeSeeding,
  );

  if (shouldClearOrdersFirst) {
    await clearOrders(pgClient);
  }

  await seedUsers(pgClient, options.users);
  await seedProducts(pgClient, options.products);
  await seedOrders(pgClient, { ...options.orders, clearBeforeSeeding: false });

  console.log('✅ Database seeding complete');
}
