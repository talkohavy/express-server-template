import { faker } from '@faker-js/faker';
import { PRODUCTS_TABLE_NAME } from '../migrations';
import type { Client } from 'pg';

const PRODUCT_CATEGORIES = ['electronics', 'home', 'apparel', 'toys', 'books', 'sports'] as const;

export type SeedProductsOptions = {
  /**
   * If true, skips seeding if products already exist. Default: true
   */
  skipIfExists?: boolean;
  /**
   * If true, clears existing products before seeding. Default: false
   */
  clearBeforeSeeding?: boolean;
  /**
   * Number of products to seed. Default: 30
   */
  count?: number;
};

/**
 * Seeds the products table with randomly generated products.
 * Ensures the table exists before seeding.
 */
export async function seedProducts(pgClient: Client, options: SeedProductsOptions = {}): Promise<number> {
  const { skipIfExists = true, clearBeforeSeeding = false, count = 30 } = options;

  if (skipIfExists && !clearBeforeSeeding) {
    const existingCount = await getProductCount(pgClient);
    if (existingCount > 0) {
      console.log(`⏭️  Skipping products seed: ${existingCount} products already exist`);
      return 0;
    }
  }

  if (clearBeforeSeeding) {
    await pgClient.query(`DELETE FROM ${PRODUCTS_TABLE_NAME}`);
    console.log('🗑️  Cleared existing products');
  }

  const insertedCount = await insertRandomProducts(pgClient, count);
  console.log(`🌱 Seeded ${insertedCount} products successfully`);

  return insertedCount;
}

async function getProductCount(pgClient: Client): Promise<number> {
  const result = await pgClient.query(`SELECT COUNT(*) FROM ${PRODUCTS_TABLE_NAME}`);

  return Number.parseInt(result.rows[0].count, 10);
}

async function insertRandomProducts(pgClient: Client, count: number): Promise<number> {
  const insertQuery = `
    INSERT INTO ${PRODUCTS_TABLE_NAME} (name, category, price_cents, created_at)
    VALUES ($1, $2, $3, $4)
  `;

  let insertedCount = 0;

  for (let i = 0; i < count; i++) {
    const category = faker.helpers.arrayElement(PRODUCT_CATEGORIES);
    const name = faker.commerce.productName();
    const priceCents = faker.number.int({ min: 500, max: 50_000 });
    const createdAt = faker.date.past({ years: 2 }).toISOString();

    const result = await pgClient.query(insertQuery, [name, category, priceCents, createdAt]);
    if (result.rowCount && result.rowCount > 0) {
      insertedCount++;
    }
  }

  return insertedCount;
}
