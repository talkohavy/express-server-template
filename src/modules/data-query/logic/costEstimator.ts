import { DataQueryError } from './errors/DataQueryError';
import type { DatasetDefinition, WidgetQuery } from '../types';

const BASE_COST = 1;
const COST_PER_DIMENSION = 1;
const COST_PER_MEASURE = 1;
const COST_PER_JOIN = 3;
const MISSING_TIME_RANGE_PENALTY = 5;

/**
 * A cheap heuristic score for how expensive a query is likely to be, evaluated
 * BEFORE hitting Postgres. This is intentionally simple (no query planning) -
 * it exists to reject obviously unbounded queries (many dimensions/joins with
 * no time filter on a time-series dataset), not to be a precise cost model.
 */
export function estimateQueryCost(query: WidgetQuery, dataset: DatasetDefinition): number {
  const dimensionsCount = query.dimensions?.length ?? 0;
  const measuresCount = query.measures?.length ?? 0;
  const joinsCount = dataset.joins?.length ?? 0;
  const hasTimeRange = Boolean(query.timeRange?.from ?? query.timeRange?.to);

  let cost = BASE_COST;
  cost += dimensionsCount * COST_PER_DIMENSION;
  cost += measuresCount * COST_PER_MEASURE;
  cost += joinsCount * COST_PER_JOIN;
  if (dataset.timeField && !hasTimeRange) cost += MISSING_TIME_RANGE_PENALTY;

  return cost;
}

/**
 * @throws DataQueryError with code QUERY_TOO_EXPENSIVE if the query is over budget.
 */
export function assertQueryWithinBudget(query: WidgetQuery, dataset: DatasetDefinition): void {
  const cost = estimateQueryCost(query, dataset);

  if (cost > dataset.costBudget) {
    throw new DataQueryError(
      'QUERY_TOO_EXPENSIVE',
      `Query cost (${cost}) exceeds the budget (${dataset.costBudget}) for dataset "${dataset.name}". ` +
        'Try narrowing dimensions/measures or adding a timeRange filter.',
    );
  }
}
