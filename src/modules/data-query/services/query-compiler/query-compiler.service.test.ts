import { RoleTypes } from '@src/common/constants';
import { DEFAULT_DATASETS } from '../../logic/constants';
import { DataQueryError } from '../../logic/errors/DataQueryError';
import { createDataQueryDbClient } from '../../logic/kyselyClient';
import { DatasetRegistryService } from '../dataset-registry';
import { QueryCompilerService } from './query-compiler.service';
import type { Kysely } from 'kysely';
import type { Database, DataQueryErrorCode, WidgetQuery } from '../../types';

function expectDataQueryErrorCode(fn: () => unknown, code: DataQueryErrorCode): void {
  expect.assertions(2);

  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(DataQueryError);
    expect((error as DataQueryError).code).toBe(code);
  }
}

describe('QueryCompilerService', () => {
  let db: Kysely<Database>;
  let datasetRegistryService: DatasetRegistryService;
  let queryCompilerService: QueryCompilerService;

  beforeAll(() => {
    // Compiling a query never touches the network, so a Pool pointed at a
    // bogus connection string is safe to use here - it's never connected.
    db = createDataQueryDbClient('postgres://user:pass@localhost:5432/test_db');
    datasetRegistryService = new DatasetRegistryService(DEFAULT_DATASETS);
    queryCompilerService = new QueryCompilerService(db, datasetRegistryService);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('compiles a simple dimension + measure query with a join', () => {
    const query: WidgetQuery = {
      id: 'q1',
      dataset: 'orders',
      dimensions: ['status'],
      measures: ['orderCount'],
    };

    const { queryBuilder } = queryCompilerService.compile(query, RoleTypes.User);
    const compiled = queryBuilder.compile();

    expect(compiled.sql).toContain('from "orders"');
    expect(compiled.sql).toContain('group by "orders"."status"');
    expect(compiled.sql).toContain('count("orders"."id") as "orderCount"');
  });

  it('applies filters as parameterized where clauses', () => {
    const query: WidgetQuery = {
      id: 'q2',
      dataset: 'orders',
      dimensions: ['status'],
      filters: [{ field: 'status', operator: 'eq', value: 'paid' }],
    };

    const { queryBuilder } = queryCompilerService.compile(query, RoleTypes.User);
    const compiled = queryBuilder.compile();

    expect(compiled.sql).toContain('where "orders"."status" = $1');
    expect(compiled.parameters[0]).toBe('paid');
  });

  it('applies timeRange as a bounded where clause on the dataset time field', () => {
    const query: WidgetQuery = {
      id: 'q3',
      dataset: 'orders',
      dimensions: ['status'],
      timeRange: { from: '2026-01-01', to: '2026-02-01' },
    };

    const { queryBuilder } = queryCompilerService.compile(query, RoleTypes.User);
    const compiled = queryBuilder.compile();

    expect(compiled.sql).toContain('"orders"."created_at" >= $1');
    expect(compiled.sql).toContain('"orders"."created_at" <= $2');
  });

  it('buckets a time dimension with date_trunc when a granularity is requested', () => {
    const query: WidgetQuery = {
      id: 'q4',
      dataset: 'orders',
      dimensions: ['createdAt'],
      measures: ['orderCount'],
      timeRange: { granularity: 'month' },
    };

    const { queryBuilder } = queryCompilerService.compile(query, RoleTypes.User);
    const compiled = queryBuilder.compile();

    expect(compiled.sql).toContain("date_trunc('month'");
  });

  it('sorts by the requested field alias when it is part of the selection', () => {
    const query: WidgetQuery = {
      id: 'q5',
      dataset: 'orders',
      dimensions: ['status'],
      measures: ['orderCount'],
      sort: [{ field: 'orderCount', direction: 'desc' }],
    };

    const { queryBuilder } = queryCompilerService.compile(query, RoleTypes.User);
    const compiled = queryBuilder.compile();

    expect(compiled.sql).toContain('order by "orderCount" desc');
  });

  it('clamps limit to the dataset maxLimit', () => {
    const query: WidgetQuery = {
      id: 'q6',
      dataset: 'orders',
      dimensions: ['status'],
      limit: 999_999,
    };

    const { queryBuilder, dataset } = queryCompilerService.compile(query, RoleTypes.User);
    const compiled = queryBuilder.compile();

    expect(compiled.sql).toMatch(/limit \$\d+ offset \$\d+$/);
    expect(compiled.parameters).toContain(dataset.maxLimit);
  });

  it('throws UNKNOWN_DATASET for an unregistered dataset', () => {
    const query: WidgetQuery = { id: 'q7', dataset: 'not-a-real-dataset', dimensions: ['status'] };

    expectDataQueryErrorCode(() => queryCompilerService.compile(query, RoleTypes.User), 'UNKNOWN_DATASET');
  });

  it('throws UNKNOWN_FIELD for an unknown dimension', () => {
    const query: WidgetQuery = { id: 'q8', dataset: 'orders', dimensions: ['notARealDimension'] };

    expectDataQueryErrorCode(() => queryCompilerService.compile(query, RoleTypes.User), 'UNKNOWN_FIELD');
  });

  it('throws UNKNOWN_FIELD when filtering on a measure instead of a dimension', () => {
    const query: WidgetQuery = {
      id: 'q9',
      dataset: 'orders',
      measures: ['orderCount'],
      filters: [{ field: 'orderCount', operator: 'gt', value: 10 }],
    };

    expectDataQueryErrorCode(() => queryCompilerService.compile(query, RoleTypes.User), 'UNKNOWN_FIELD');
  });

  it('throws FORBIDDEN_FIELD when a non-admin role requests a role-gated measure', () => {
    const query: WidgetQuery = { id: 'q10', dataset: 'orders', dimensions: ['status'], measures: ['revenueSum'] };

    expectDataQueryErrorCode(() => queryCompilerService.compile(query, RoleTypes.User), 'FORBIDDEN_FIELD');
  });

  it('allows an admin role to request a role-gated measure', () => {
    const query: WidgetQuery = { id: 'q11', dataset: 'orders', dimensions: ['status'], measures: ['revenueSum'] };

    const { queryBuilder } = queryCompilerService.compile(query, RoleTypes.Admin);
    const compiled = queryBuilder.compile();

    expect(compiled.sql).toContain('as "revenueSum"');
  });

  it('throws UNKNOWN_FIELD when sorting by a field not in the selection', () => {
    const query: WidgetQuery = {
      id: 'q12',
      dataset: 'orders',
      dimensions: ['status'],
      sort: [{ field: 'productCategory', direction: 'asc' }],
    };

    expectDataQueryErrorCode(() => queryCompilerService.compile(query, RoleTypes.User), 'UNKNOWN_FIELD');
  });
});
