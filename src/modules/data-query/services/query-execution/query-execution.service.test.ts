import { RoleTypes } from '@src/common/constants';
import { DataQueryError } from '../../logic/errors/DataQueryError';
import { QueryExecutionService } from './query-execution.service';
import type { DataQueryExecutionContext, WidgetQuery } from '../../types';
import type { QueryCompilerService } from '../query-compiler';

describe('QueryExecutionService', () => {
  let mockQueryCompiler: jest.Mocked<QueryCompilerService>;
  let mockRedis: { get: jest.Mock; setEx: jest.Mock };
  let mockLogger: { error: jest.Mock };
  let service: QueryExecutionService;
  let context: DataQueryExecutionContext;

  beforeEach(() => {
    mockQueryCompiler = { compile: jest.fn() } as any;
    mockRedis = { get: jest.fn(), setEx: jest.fn() };
    mockLogger = { error: jest.fn() };
    context = { role: RoleTypes.User };

    service = new QueryExecutionService(mockQueryCompiler, mockRedis as any, mockLogger as any);
  });

  function makeQuery(overrides: Partial<WidgetQuery> = {}): WidgetQuery {
    return { id: 'w1', dataset: 'orders', dimensions: ['status'], ...overrides };
  }

  it('returns an ok result with fresh rows and caches them on a cache miss', async () => {
    const rows = [{ status: 'paid' }];
    mockQueryCompiler.compile.mockReturnValue({
      dataset: { name: 'orders', maxLimit: 100, costBudget: 100 } as any,
      queryBuilder: { execute: jest.fn().mockResolvedValue(rows) } as any,
    });
    mockRedis.get.mockResolvedValue(null);

    const [result] = await service.executeBatch([makeQuery()], context);

    expect(result).toMatchObject({ id: 'w1', status: 'ok', rows, meta: { rowCount: 1, cached: false } });
    expect(mockRedis.setEx).toHaveBeenCalledWith(expect.stringMatching(/^dataQuery:/), 30, JSON.stringify(rows));
  });

  it('returns cached rows without executing the query on a cache hit', async () => {
    const rows = [{ status: 'shipped' }];
    const execute = jest.fn();
    mockQueryCompiler.compile.mockReturnValue({
      dataset: { name: 'orders', maxLimit: 100, costBudget: 100 } as any,
      queryBuilder: { execute } as any,
    });
    mockRedis.get.mockResolvedValue(JSON.stringify(rows));

    const [result] = await service.executeBatch([makeQuery()], context);

    expect(result).toMatchObject({ id: 'w1', status: 'ok', rows, meta: { cached: true } });
    expect(execute).not.toHaveBeenCalled();
  });

  it('turns a DataQueryError from the compiler into a per-query error result', async () => {
    mockQueryCompiler.compile.mockImplementation(() => {
      throw new DataQueryError('UNKNOWN_DATASET', 'Unknown dataset "nope"');
    });

    const [result] = await service.executeBatch([makeQuery({ dataset: 'nope' })], context);

    expect(result).toEqual({
      id: 'w1',
      status: 'error',
      error: { code: 'UNKNOWN_DATASET', message: 'Unknown dataset "nope"' },
    });
  });

  it('rejects a query that exceeds its dataset cost budget without hitting the cache or the db', async () => {
    const execute = jest.fn();
    mockQueryCompiler.compile.mockReturnValue({
      // costBudget of 0 guarantees the cost estimate exceeds budget.
      dataset: { name: 'orders', maxLimit: 100, costBudget: 0, joins: [] } as any,
      queryBuilder: { execute } as any,
    });

    const [result] = await service.executeBatch([makeQuery()], context);

    expect(result).toMatchObject({ id: 'w1', status: 'error', error: { code: 'QUERY_TOO_EXPENSIVE' } });
    expect(mockRedis.get).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('logs and returns a generic EXECUTION_ERROR for unexpected (non-DataQueryError) failures', async () => {
    mockQueryCompiler.compile.mockReturnValue({
      dataset: { name: 'orders', maxLimit: 100, costBudget: 100 } as any,
      queryBuilder: { execute: jest.fn().mockRejectedValue(new Error('connection refused')) } as any,
    });
    mockRedis.get.mockResolvedValue(null);

    const [result] = await service.executeBatch([makeQuery()], context);

    expect(result).toEqual({
      id: 'w1',
      status: 'error',
      error: { code: 'EXECUTION_ERROR', message: 'Failed to execute query' },
    });
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('isolates failures per query within a batch', async () => {
    mockQueryCompiler.compile.mockImplementation((query: WidgetQuery) => {
      if (query.id === 'bad') {
        throw new DataQueryError('UNKNOWN_FIELD', 'boom');
      }
      return {
        dataset: { name: 'orders', maxLimit: 100, costBudget: 100 } as any,
        queryBuilder: { execute: jest.fn().mockResolvedValue([{ status: 'paid' }]) } as any,
      };
    });
    mockRedis.get.mockResolvedValue(null);

    const results = await service.executeBatch([makeQuery({ id: 'good' }), makeQuery({ id: 'bad' })], context);

    expect(results).toEqual([
      expect.objectContaining({ id: 'good', status: 'ok' }),
      expect.objectContaining({ id: 'bad', status: 'error' }),
    ]);
  });
});
