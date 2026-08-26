export const FilterOperators = {
  Eq: 'eq',
  Ne: 'ne',
  In: 'in',
  NotIn: 'notIn',
  Gt: 'gt',
  Gte: 'gte',
  Lt: 'lt',
  Lte: 'lte',
  Between: 'between',
} as const;

export type FilterOperatorValues = (typeof FilterOperators)[keyof typeof FilterOperators];
