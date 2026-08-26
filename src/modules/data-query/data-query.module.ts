import { ConfigKeys } from '@src/plugins/config-service';
import { DataQueryController } from './controllers/data-query';
import { DEFAULT_DATASETS } from './logic/constants';
import { createDataQueryDbClient } from './logic/kyselyClient';
import { DatasetRegistryService } from './services/dataset-registry';
import { QueryCompilerService } from './services/query-compiler';
import { QueryExecutionService } from './services/query-execution';
import type { Application } from 'express';
import type { Kysely } from 'kysely';
import type { ModuleFactory } from '@src/lib/lucky-server';
import type { PostgresConfig } from '@src/plugins/config-service';
import type { Database } from './types';

export class DataQueryModule implements ModuleFactory {
  private dataQueryDbClient!: Kysely<Database>;
  private datasetRegistryService!: DatasetRegistryService;
  private queryCompilerService!: QueryCompilerService;
  private queryExecutionService!: QueryExecutionService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    const { configService, redis, logger } = this.app;

    const { connectionString } = configService.get<PostgresConfig>(ConfigKeys.Postgres);

    // Dedicated pool - NOT app.pg. See logic/kyselyClient.ts for why.
    this.dataQueryDbClient = createDataQueryDbClient(connectionString);

    this.datasetRegistryService = new DatasetRegistryService(DEFAULT_DATASETS);
    this.queryCompilerService = new QueryCompilerService(this.dataQueryDbClient, this.datasetRegistryService);
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
