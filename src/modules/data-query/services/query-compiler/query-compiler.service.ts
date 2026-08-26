import { sql } from 'kysely';
import { DataQueryError } from '../../logic/errors/DataQueryError';
import { isRoleAllowed } from '../../logic/roleHierarchy';
import { DEFAULT_LIMIT } from './logic/constants';
import type { Kysely } from 'kysely';
import type { RoleTypeValues } from '@src/common/constants';
import type { Database, DatasetDefinition, FilterInput, WidgetQuery } from '../../types';
import type { DatasetRegistryService } from '../dataset-registry';
import type { CompiledDataQuery } from './types';

export class QueryCompilerService {
  constructor(
    private readonly dbClient: Kysely<Database>,
    private readonly datasetRegistry: DatasetRegistryService,
  ) {}

  /**
   * @throws DataQueryError for any unknown dataset/field/operator or role-forbidden measure.
   */
  compile(query: WidgetQuery, role: RoleTypeValues): CompiledDataQuery {
    const dataset = this.datasetRegistry.getDataset(query.dataset);

    if (!dataset) {
      throw new DataQueryError('UNKNOWN_DATASET', `Unknown dataset "${query.dataset}"`);
    }

    let queryBuilder: any = this.dbClient.selectFrom(dataset.table as any);

    queryBuilder = this.applyJoins(queryBuilder, dataset);
    queryBuilder = this.applySelect(queryBuilder, query, dataset, role);
    queryBuilder = this.applyFilters(queryBuilder, query, dataset);
    queryBuilder = this.applyGroupBy(queryBuilder, query, dataset);
    queryBuilder = this.applySort(queryBuilder, query);
    queryBuilder = this.applyPagination(queryBuilder, query, dataset);

    return { dataset, queryBuilder };
  }

  private applyJoins(queryBuilder: any, dataset: DatasetDefinition): any {
    let result = queryBuilder;

    for (const join of dataset.joins ?? []) {
      result = result.innerJoin(join.table as any, (jb: any) =>
        jb.onRef(this.dbClient.dynamic.ref(join.leftColumn), '=', this.dbClient.dynamic.ref(join.rightColumn)),
      );
    }

    return result;
  }

  private applySelect(queryBuilder: any, query: WidgetQuery, dataset: DatasetDefinition, role: RoleTypeValues): any {
    const dimensionKeys = query.dimensions ?? [];
    const measureKeys = query.measures ?? [];

    if (dimensionKeys.length === 0 && measureKeys.length === 0) {
      throw new DataQueryError('UNKNOWN_FIELD', 'At least one dimension or measure must be requested');
    }

    let result = queryBuilder;

    dimensionKeys.forEach((key) => {
      const expression = this.resolveDimensionExpression(key, dataset, query);
      result = result.select(expression.as(key));
    });

    measureKeys.forEach((key) => {
      const measure = dataset.measures[key];

      if (!measure) {
        throw new DataQueryError('UNKNOWN_FIELD', `Unknown measure "${key}" for dataset "${dataset.name}"`);
      }

      if (!isRoleAllowed(role, measure.minRole)) {
        throw new DataQueryError('FORBIDDEN_FIELD', `Measure "${key}" is not available for your role`);
      }

      const ref = this.dbClient.dynamic.ref(measure.column);

      result = result.select((eb: any) => eb.fn[measure.aggregation](ref).as(key));
    });

    return result;
  }

  private applyFilters(queryBuilder: any, query: WidgetQuery, dataset: DatasetDefinition): any {
    let result = queryBuilder;

    (query.filters ?? []).forEach((filter) => {
      result = result.where((eb: any) => this.buildFilterExpression(eb, filter, dataset));
    });

    if (dataset.timeField && query.timeRange) {
      const ref = this.dbClient.dynamic.ref(dataset.timeField);

      if (query.timeRange.from) {
        result = result.where(ref, '>=', new Date(query.timeRange.from));
      }
      if (query.timeRange.to) {
        result = result.where(ref, '<=', new Date(query.timeRange.to));
      }
    }

    return result;
  }

  private buildFilterExpression(eb: any, filter: FilterInput, dataset: DatasetDefinition): any {
    const dimension = dataset.dimensions[filter.field];

    if (!dimension) {
      throw new DataQueryError(
        'UNKNOWN_FIELD',
        `Unknown filter field "${filter.field}" for dataset "${dataset.name}". Filters can only target dimensions.`,
      );
    }

    const ref = this.dbClient.dynamic.ref(dimension.column);

    switch (filter.operator) {
      case 'eq':
        return eb(ref, '=', filter.value);
      case 'ne':
        return eb(ref, '!=', filter.value);
      case 'gt':
        return eb(ref, '>', filter.value);
      case 'gte':
        return eb(ref, '>=', filter.value);
      case 'lt':
        return eb(ref, '<', filter.value);
      case 'lte':
        return eb(ref, '<=', filter.value);
      case 'in':
        return eb(ref, 'in', filter.value as unknown[]);
      case 'notIn':
        return eb(ref, 'not in', filter.value as unknown[]);
      case 'between': {
        const [from, to] = filter.value as [unknown, unknown];
        return eb.and([eb(ref, '>=', from), eb(ref, '<=', to)]);
      }
      default:
        throw new DataQueryError('UNKNOWN_OPERATOR', `Unknown filter operator "${filter.operator}"`);
    }
  }

  private applyGroupBy(queryBuilder: any, query: WidgetQuery, dataset: DatasetDefinition): any {
    const dimensionKeys = query.dimensions ?? [];
    const measureKeys = query.measures ?? [];

    // No aggregation requested -> plain row listing, nothing to group by.
    if (measureKeys.length === 0 || dimensionKeys.length === 0) {
      return queryBuilder;
    }

    let result = queryBuilder;

    dimensionKeys.forEach((key) => {
      const expression = this.resolveDimensionExpression(key, dataset, query);
      result = result.groupBy(expression);
    });

    return result;
  }

  private applySort(queryBuilder: any, query: WidgetQuery): any {
    let result = queryBuilder;
    const selectedKeys = new Set([...(query.dimensions ?? []), ...(query.measures ?? [])]);

    (query.sort ?? []).forEach((sortInput) => {
      if (!selectedKeys.has(sortInput.field)) {
        throw new DataQueryError(
          'UNKNOWN_FIELD',
          `Cannot sort by "${sortInput.field}": it must also be included in dimensions or measures`,
        );
      }

      // Sorting by the output alias (valid standard SQL) avoids duplicating the dimension/measure expression-resolution logic here.
      result = result.orderBy(sql.id(sortInput.field), sortInput.direction);
    });

    return result;
  }

  private applyPagination(queryBuilder: any, query: WidgetQuery, dataset: DatasetDefinition): any {
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, dataset.maxLimit);
    const offset = query.offset ?? 0;

    return queryBuilder.limit(limit).offset(offset);
  }

  /**
   * Resolves a dimension key to a selectable/groupable expression, bucketing
   * by date_trunc when it's the dataset's declared time field and a
   * granularity was requested.
   */
  private resolveDimensionExpression(dimensionKey: string, dataset: DatasetDefinition, query: WidgetQuery): any {
    const dimension = dataset.dimensions[dimensionKey];

    if (!dimension) {
      throw new DataQueryError('UNKNOWN_FIELD', `Unknown dimension "${dimensionKey}" for dataset "${dataset.name}"`);
    }

    const granularity = query.timeRange?.granularity;
    const isTimeField = dataset.timeField === dimension.column;

    if (isTimeField && granularity) {
      return sql`date_trunc(${sql.lit(granularity)}, ${this.dbClient.dynamic.ref(dimension.column)})`;
    }

    // Wrapped in `sql` (rather than returned as a bare dynamic ref) so it uniformly supports `.as(alias)`, same as the date_trunc branch above.
    return sql`${this.dbClient.dynamic.ref(dimension.column)}`;
  }
}
