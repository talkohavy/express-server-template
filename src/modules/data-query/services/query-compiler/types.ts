import type { SelectQueryBuilder } from 'kysely';
import type { Database, DatasetDefinition } from '../../types';

export type CompiledDataQuery = {
  dataset: DatasetDefinition;
  queryBuilder: SelectQueryBuilder<Database, any, any>;
};
