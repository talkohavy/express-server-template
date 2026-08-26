import type { DataQueryErrorCode } from '../../types';

/**
 * A per-query error for the POST /api/data batch endpoint.
 * Caught by QueryExecutionService and turned into a `status: 'error'` result entry,
 * so it never bubbles up to the global error handler and never fails the whole batch.
 */
export class DataQueryError extends Error {
  public readonly code: DataQueryErrorCode;

  constructor(code: DataQueryErrorCode, message: string) {
    super(message);
    this.name = 'DataQueryError';
    this.code = code;
  }
}
