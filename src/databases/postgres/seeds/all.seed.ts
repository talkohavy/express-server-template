import { seedOrders, type SeedOrdersOptions } from './orders.seed';
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
 */
export async function runAllSeeds(pgClient: Client, options: RunAllSeedsOptions = {}): Promise<void> {
  console.log('🌱 Starting database seeding...');

  await seedUsers(pgClient, options.users);
  await seedProducts(pgClient, options.products);
  await seedOrders(pgClient, options.orders);

  console.log('✅ Database seeding complete');
}
