export const MeasureAggregations = {
  Count: 'count',
  Sum: 'sum',
  Avg: 'avg',
  Min: 'min',
  Max: 'max',
} as const;

export type MeasureAggregationValues = (typeof MeasureAggregations)[keyof typeof MeasureAggregations];
