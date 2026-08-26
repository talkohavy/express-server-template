import { DataQueryError } from '../errors/DataQueryError';
import { estimateQueryCost } from './estimate-query-cost';
import type { DatasetDefinition, WidgetQuery } from '../../types';

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
