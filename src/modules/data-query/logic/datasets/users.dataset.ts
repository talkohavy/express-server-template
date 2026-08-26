import type { DatasetDefinition } from '../../types';

export const usersDataset: DatasetDefinition = {
  name: 'users',
  table: 'users',
  dimensions: {
    role: { label: 'Role', column: 'users.role', type: 'string' },
    isActive: { label: 'Is Active', column: 'users.is_active', type: 'boolean' },
    createdAt: { label: 'Signup Date', column: 'users.created_at', type: 'date' },
  },
  measures: {
    userCount: { label: 'User Count', column: 'users.id', aggregation: 'count' },
  },
  timeField: 'users.created_at',
  maxLimit: 500,
  costBudget: 15,
};
