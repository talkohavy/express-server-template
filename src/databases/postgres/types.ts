import type { Generated } from 'kysely';

export type UsersTable = {
  id: number;
  email: string;
  nickname: string | null;
  role: string;
  is_active: boolean;
  created_at: Date;
};

export type ProductsTable = {
  id: number;
  name: string;
  category: string;
  price_cents: number;
  created_at: Date;
};

export type OrdersTable = {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  status: string;
  total_amount_cents: number;
  created_at: Date;
};

export type FeatureFlagsTable = {
  id: Generated<number>;
  key: string;
  is_enabled: boolean;
  description: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

export type RefreshTokensTable = {
  id: string;
  user_id: number;
  family_id: string;
  token_hash: string;
  expires_at: Date;
  session_expires_at: Date;
  revoked_at: Date | null;
  created_at: Generated<Date>;
};

export type Database = {
  users: UsersTable;
  products: ProductsTable;
  orders: OrdersTable;
  feature_flags: FeatureFlagsTable;
  refresh_tokens: RefreshTokensTable;
};
