import { parseJson } from '@src/common/utils/parseJson';
import { DataQueryError } from '../../logic/errors/DataQueryError';
import { assertQueryWithinBudget } from '../../logic/utils/assert-query-within-budget';
import { buildDataQueryCacheKey } from '../../logic/utils/build-data-query-cache-key';
import { QueryStatuses, CACHE_TTL_SECONDS } from './logic/constants';
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
   * Executes every query independently and concurrently. A failure in
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
      const compiledQuery = this.queryCompiler.compile(query, context.role);

      const { dataset, queryBuilder } = compiledQuery;

      assertQueryWithinBudget(query, dataset);

      const queryCacheKey = buildDataQueryCacheKey(query, context.role);
      const cacheHit = await this.redis.get(queryCacheKey);

      if (cacheHit) {
        const rows = parseJson<Record<string, unknown>[]>(cacheHit) ?? [];

        return {
          id: query.id,
          status: QueryStatuses.Ok,
          rows,
          meta: {
            rowCount: rows.length,
            executionMs: Date.now() - startedAt,
            cached: true,
          },
        };
      }

      const rows = (await queryBuilder.execute()) as Record<string, unknown>[];

      await this.redis.setEx(queryCacheKey, CACHE_TTL_SECONDS, JSON.stringify(rows));

      return {
        id: query.id,
        status: QueryStatuses.Ok,
        rows,
        meta: {
          rowCount: rows.length,
          executionMs: Date.now() - startedAt,
          cached: false,
        },
      };
    } catch (error) {
      if (error instanceof DataQueryError) {
        return {
          id: query.id,
          status: QueryStatuses.Error,
          error: {
            code: error.code,
            message: error.message,
          },
        };
      }

      this.logger.error(`Unexpected error executing widget query "${query.id}"`, error);

      return {
        id: query.id,
        status: QueryStatuses.Error,
        error: {
          code: 'EXECUTION_ERROR',
          message: 'Failed to execute query',
        },
      };
    }
  }
}
