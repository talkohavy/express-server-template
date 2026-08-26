import { API_PATHS, StatusCodes } from '@src/common/constants';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { resolveRole } from '../../logic/resolveRole';
import { executeDataQueriesSchema } from './dto/executeQueries.dto';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { DatasetRegistryService } from '../../services/dataset-registry';
import type { QueryExecutionService } from '../../services/query-execution';
import type { ExecuteDataQueriesRequest, ExecuteDataQueriesResponse } from '../../types';

export class DataQueryController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly datasetRegistryService: DatasetRegistryService,
    private readonly queryExecutionService: QueryExecutionService,
  ) {}

  registerRoutes() {
    this.executeQueries();
    this.getSchema();
  }

  private executeQueries() {
    this.app.post(
      API_PATHS.dataQuery,
      joiBodyMiddleware(executeDataQueriesSchema),
      async (req: Request, res: Response) => {
        const { queries } = req.body as ExecuteDataQueriesRequest;
        const role = resolveRole(req.user?.role);

        this.app.logger.info(
          `POST ${API_PATHS.dataQuery} - executing ${queries.length} widget quer${queries.length === 1 ? 'y' : 'ies'}`,
        );

        const results = await this.queryExecutionService.executeBatch(queries, { role });

        const response: ExecuteDataQueriesResponse = { results };

        res.status(StatusCodes.OK).json(response);
      },
    );
  }

  private getSchema() {
    this.app.get(API_PATHS.dataQuerySchema, (req: Request, res: Response) => {
      const role = resolveRole(req.user?.role);

      this.app.logger.info(`GET ${API_PATHS.dataQuerySchema} - fetching public dataset schema`);

      const datasets = this.datasetRegistryService.getPublicSchema(role);

      res.json({ datasets });
    });
  }
}
