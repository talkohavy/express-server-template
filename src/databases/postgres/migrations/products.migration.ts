import type { Client } from 'pg';

export const PRODUCTS_TABLE_NAME = 'products';

export const productsTableSchema = `
  CREATE TABLE IF NOT EXISTS public.${PRODUCTS_TABLE_NAME}
  (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price_cents INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
`;

export async function createProductsTable(pgClient: Client): Promise<void> {
  await pgClient.query(productsTableSchema);
}
