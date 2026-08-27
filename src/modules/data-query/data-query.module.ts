import { DataQueryController } from './controllers/data-query';
import { DEFAULT_DATASETS } from './logic/constants';
import { DatasetRegistryService } from './services/dataset-registry';
import { QueryCompilerService } from './services/query-compiler';
import { QueryExecutionService } from './services/query-execution';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

export class DataQueryModule implements ModuleFactory {
  private datasetRegistryService!: DatasetRegistryService;
  private queryCompilerService!: QueryCompilerService;
  private queryExecutionService!: QueryExecutionService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    const { redis, logger, kysely } = this.app;

    this.datasetRegistryService = new DatasetRegistryService(DEFAULT_DATASETS);
    this.queryCompilerService = new QueryCompilerService(kysely, this.datasetRegistryService);
    this.queryExecutionService = new QueryExecutionService(this.queryCompilerService, redis.pub, logger);

    this.attachControllers();
  }

  private attachControllers(): void {
    const dataQueryController = new DataQueryController(
      this.app,
      this.datasetRegistryService,
      this.queryExecutionService,
    );

    dataQueryController.registerRoutes();
  }

  get services() {
    return {
      queryExecutionService: this.queryExecutionService,
      datasetRegistryService: this.datasetRegistryService,
    };
  }
}
