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

export type Database = {
  users: UsersTable;
  products: ProductsTable;
  orders: OrdersTable;
};
