import { RoleTypes } from '@src/common/constants';
import type { DatasetDefinition } from '../../types';

export const ordersDataset: DatasetDefinition = {
  name: 'orders',
  table: 'orders',
  joins: [
    { table: 'users', leftColumn: 'orders.user_id', rightColumn: 'users.id' },
    { table: 'products', leftColumn: 'orders.product_id', rightColumn: 'products.id' },
  ],
  dimensions: {
    status: { label: 'Order Status', column: 'orders.status', type: 'string' },
    productCategory: { label: 'Product Category', column: 'products.category', type: 'string' },
    productName: { label: 'Product Name', column: 'products.name', type: 'string' },
    customerEmail: { label: 'Customer Email', column: 'users.email', type: 'string' },
    createdAt: { label: 'Order Date', column: 'orders.created_at', type: 'date' },
  },
  measures: {
    orderCount: { label: 'Order Count', column: 'orders.id', aggregation: 'count' },
    quantitySum: { label: 'Quantity Sold', column: 'orders.quantity', aggregation: 'sum' },
    // Revenue figures are restricted to admins to demonstrate per-measure role gating.
    revenueSum: {
      label: 'Revenue (cents)',
      column: 'orders.total_amount_cents',
      aggregation: 'sum',
      minRole: RoleTypes.Admin,
    },
    avgOrderValueCents: {
      label: 'Average Order Value (cents)',
      column: 'orders.total_amount_cents',
      aggregation: 'avg',
      minRole: RoleTypes.Admin,
    },
  },
  timeField: 'orders.created_at',
  maxLimit: 1000,
  costBudget: 25,
};
