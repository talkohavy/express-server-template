export type DataQueryErrorCode =
  | 'UNKNOWN_DATASET'
  | 'UNKNOWN_FIELD'
  | 'UNKNOWN_OPERATOR'
  | 'FORBIDDEN_FIELD'
  | 'QUERY_TOO_EXPENSIVE'
  | 'EXECUTION_ERROR';

export type WidgetQuerySuccessResult = {
  id: string;
  status: 'ok';
  rows: Record<string, unknown>[];
  meta: {
    rowCount: number;
    executionMs: number;
    cached: boolean;
  };
};

export type WidgetQueryErrorResult = {
  id: string;
  status: 'error';
  error: {
    code: DataQueryErrorCode;
    message: string;
  };
};

export type WidgetQueryResult = WidgetQuerySuccessResult | WidgetQueryErrorResult;

export type ExecuteDataQueriesResponse = {
  results: WidgetQueryResult[];
};
