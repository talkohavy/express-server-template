import type { DatasetDefinition } from '../../types';

export const productsDataset: DatasetDefinition = {
  name: 'products',
  table: 'products',
  dimensions: {
    category: { label: 'Category', column: 'products.category', type: 'string' },
    name: { label: 'Product Name', column: 'products.name', type: 'string' },
    createdAt: { label: 'Listed Date', column: 'products.created_at', type: 'date' },
  },
  measures: {
    productCount: { label: 'Product Count', column: 'products.id', aggregation: 'count' },
    avgPriceCents: { label: 'Average Price (cents)', column: 'products.price_cents', aggregation: 'avg' },
  },
  timeField: 'products.created_at',
  maxLimit: 500,
  costBudget: 15,
};
