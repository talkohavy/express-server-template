import type { FilterOperatorValues, TimeRangeGranularityValues } from '../logic/constants';

export type FilterInput = {
  field: string;
  operator: FilterOperatorValues;
  value: unknown;
};

export type SortInput = {
  field: string;
  direction: 'asc' | 'desc';
};

export type TimeRangeInput = {
  from?: string;
  to?: string;
  granularity?: TimeRangeGranularityValues;
};

export type WidgetQuery = {
  /** Widget-assigned id, echoed back in the result so the client can match it up */
  id: string;
  /** Dataset registry key — never a raw table/SQL */
  dataset: string;
  dimensions?: string[];
  measures?: string[];
  filters?: FilterInput[];
  timeRange?: TimeRangeInput;
  sort?: SortInput[];
  limit?: number;
  offset?: number;
};

export type ExecuteDataQueriesRequest = {
  queries: WidgetQuery[];
};
