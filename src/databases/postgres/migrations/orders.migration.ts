import type { Client } from 'pg';

export const ORDERS_TABLE_NAME = 'orders';

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'cancelled'] as const;

export const ordersTableSchema = `
  CREATE TABLE IF NOT EXISTS public.${ORDERS_TABLE_NAME}
  (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    product_id INTEGER NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount_cents INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
`;

export async function createOrdersTable(pgClient: Client): Promise<void> {
  await pgClient.query(ordersTableSchema);
}
