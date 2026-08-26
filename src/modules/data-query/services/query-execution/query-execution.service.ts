import { parseJson } from '@src/common/utils/parseJson';
import { buildCacheKey } from '../../logic/buildCacheKey';
import { CACHE_TTL_SECONDS } from '../../logic/constants';
import { assertQueryWithinBudget } from '../../logic/costEstimator';
import { DataQueryError } from '../../logic/errors/DataQueryError';
import type { RedisClientType } from 'redis';
import type { LoggerService } from '@src/core/services/logger';
import type { DataQueryExecutionContext, WidgetQuery, WidgetQueryResult } from '../../types';
import type { QueryCompilerService } from '../query-compiler';

export class QueryExecutionService {
  constructor(
    private readonly queryCompiler: QueryCompilerService,
    private readonly redis: RedisClientType,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Executes every widget query independently and concurrently. A failure in
   * one query (unknown field, over budget, DB error, ...) never affects the
   * others - each result carries its own status.
   */
  async executeBatch(queries: WidgetQuery[], context: DataQueryExecutionContext): Promise<WidgetQueryResult[]> {
    const results = await Promise.all(queries.map((query) => this.executeOne(query, context)));

    return results;
  }

  private async executeOne(query: WidgetQuery, context: DataQueryExecutionContext): Promise<WidgetQueryResult> {
    const startedAt = Date.now();

    try {
      const compiled = this.queryCompiler.compile(query, context.role);

      assertQueryWithinBudget(query, compiled.dataset);

      const cacheKey = buildCacheKey(query, context.role);
      const cacheHit = await this.redis.get(cacheKey);

      if (cacheHit) {
        const rows = parseJson<Record<string, unknown>[]>(cacheHit) ?? [];

        return this.toSuccessResult(query.id, rows, startedAt, true);
      }

      const rows = (await compiled.queryBuilder.execute()) as Record<string, unknown>[];

      await this.redis.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(rows));

      return this.toSuccessResult(query.id, rows, startedAt, false);
    } catch (error) {
      return this.toErrorResult(query.id, error);
    }
  }

  private toSuccessResult(
    id: string,
    rows: Record<string, unknown>[],
    startedAt: number,
    cached: boolean,
  ): WidgetQueryResult {
    return {
      id,
      status: 'ok',
      rows,
      meta: {
        rowCount: rows.length,
        executionMs: Date.now() - startedAt,
        cached,
      },
    };
  }

  private toErrorResult(id: string, error: unknown): WidgetQueryResult {
    if (error instanceof DataQueryError) {
      return { id, status: 'error', error: { code: error.code, message: error.message } };
    }

    this.logger.error(`Unexpected error executing widget query "${id}"`, error);

    return {
      id,
      status: 'error',
      error: { code: 'EXECUTION_ERROR', message: 'Failed to execute query' },
    };
  }
}
