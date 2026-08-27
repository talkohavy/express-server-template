import { isRoleAllowed } from '../../logic/utils/roleHierarchy';
import type { RoleTypeValues } from '@src/common/constants';
import type { DatasetDefinition, PublicDatasetSchema } from '../../types';

/**
 * The dataset registry is the "semantic layer": the only vocabulary the client
 * can query against. It never exposes raw table/column names to callers -
 * see getPublicSchema(), used by GET /api/data/schema.
 */
export class DatasetRegistryService {
  private readonly datasets: Map<string, DatasetDefinition>;

  constructor(datasets: DatasetDefinition[]) {
    this.datasets = new Map(datasets.map((dataset) => [dataset.name, dataset]));
  }

  getDataset(name: string): DatasetDefinition | undefined {
    return this.datasets.get(name);
  }

  getPublicSchema(role: RoleTypeValues): PublicDatasetSchema[] {
    const datasets = [...this.datasets.values()];
    const publicSchemas = datasets.map((dataset) => this.toPublicSchema(dataset, role));

    return publicSchemas;
  }

  private toPublicSchema(dataset: DatasetDefinition, role: RoleTypeValues): PublicDatasetSchema {
    const dimensionEntries = Object.entries(dataset.dimensions).map(([key, dimension]) => {
      return [key, { label: dimension.label, type: dimension.type }] as const;
    });

    const visibleMeasureEntries = Object.entries(dataset.measures)
      .filter(([, measure]) => isRoleAllowed(role, measure.minRole))
      .map(([key, measure]) => {
        return [key, { label: measure.label, aggregation: measure.aggregation }] as const;
      });

    return {
      name: dataset.name,
      dimensions: Object.fromEntries(dimensionEntries),
      measures: Object.fromEntries(visibleMeasureEntries),
      maxLimit: dataset.maxLimit,
    };
  }
}
