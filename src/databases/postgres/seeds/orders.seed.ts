import { faker } from '@faker-js/faker';
import { ORDERS_TABLE_NAME, ORDER_STATUSES, PRODUCTS_TABLE_NAME, USERS_TABLE_NAME } from '../migrations';
import type { Client } from 'pg';

export type SeedOrdersOptions = {
  /**
   * If true, skips seeding if orders already exist. Default: true
   */
  skipIfExists?: boolean;
  /**
   * If true, clears existing orders before seeding. Default: false
   */
  clearBeforeSeeding?: boolean;
  /**
   * Number of orders to seed. Default: 200
   */
  count?: number;
};

/**
 * Seeds the orders table with randomly generated orders, referencing existing
 * users and products. Must run after users and products have been seeded.
 */
export async function seedOrders(pgClient: Client, options: SeedOrdersOptions = {}): Promise<number> {
  const { skipIfExists = true, clearBeforeSeeding = false, count = 200 } = options;

  if (skipIfExists && !clearBeforeSeeding) {
    const existingCount = await getOrderCount(pgClient);
    if (existingCount > 0) {
      console.log(`⏭️  Skipping orders seed: ${existingCount} orders already exist`);
      return 0;
    }
  }

  if (clearBeforeSeeding) {
    await clearOrders(pgClient);
  }

  const userIds = await getAllIds(pgClient, USERS_TABLE_NAME);
  const products = await getAllProducts(pgClient);

  if (userIds.length === 0 || products.length === 0) {
    console.log('⏭️  Skipping orders seed: users or products table is empty');
    return 0;
  }

  const insertedCount = await insertRandomOrders(pgClient, count, userIds, products);
  console.log(`🌱 Seeded ${insertedCount} orders successfully`);

  return insertedCount;
}

/**
 * Deletes all rows from the orders table.
 * Exported so `orders` can be cleared before `users`/`products`, since `orders`
 * holds foreign keys referencing both and must be emptied first to avoid
 * foreign key constraint violations.
 */
export async function clearOrders(pgClient: Client): Promise<void> {
  await pgClient.query(`DELETE FROM ${ORDERS_TABLE_NAME}`);
  console.log('🗑️  Cleared existing orders');
}

async function getOrderCount(pgClient: Client): Promise<number> {
  const result = await pgClient.query(`SELECT COUNT(*) FROM ${ORDERS_TABLE_NAME}`);

  return Number.parseInt(result.rows[0].count, 10);
}

async function getAllIds(pgClient: Client, tableName: string): Promise<number[]> {
  const result = await pgClient.query(`SELECT id FROM ${tableName}`);

  return result.rows.map((row) => row.id);
}

async function getAllProducts(pgClient: Client): Promise<Array<{ id: number; priceCents: number }>> {
  const result = await pgClient.query(`SELECT id, price_cents FROM ${PRODUCTS_TABLE_NAME}`);

  return result.rows.map((row) => ({ id: row.id, priceCents: row.price_cents }));
}

async function insertRandomOrders(
  pgClient: Client,
  count: number,
  userIds: number[],
  products: Array<{ id: number; priceCents: number }>,
): Promise<number> {
  const insertQuery = `
    INSERT INTO ${ORDERS_TABLE_NAME} (user_id, product_id, quantity, status, total_amount_cents, created_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;

  let insertedCount = 0;

  for (let i = 0; i < count; i++) {
    const userId = faker.helpers.arrayElement(userIds);
    const product = faker.helpers.arrayElement(products);
    const quantity = faker.number.int({ min: 1, max: 5 });
    const status = faker.helpers.arrayElement(ORDER_STATUSES);
    const totalAmountCents = product.priceCents * quantity;
    const createdAt = faker.date.past({ years: 2 }).toISOString();

    const result = await pgClient.query(insertQuery, [
      userId,
      product.id,
      quantity,
      status,
      totalAmountCents,
      createdAt,
    ]);
    if (result.rowCount && result.rowCount > 0) {
      insertedCount++;
    }
  }

  return insertedCount;
}
