import express, { type Application } from 'express';
import request from 'supertest';
import { API_PATHS, RoleTypes, StatusCodes } from '@src/common/constants';
import { DataQueryController } from './data-query.controller';
import type { DatasetRegistryService } from '../../services/dataset-registry';
import type { QueryExecutionService } from '../../services/query-execution';
import type { WidgetQueryResult } from '../../types';

jest.mock('@src/middlewares/joi-body.middleware', () => ({
  joiBodyMiddleware: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

describe('DataQueryController', () => {
  let app: Application;
  let mockDatasetRegistryService: jest.Mocked<DatasetRegistryService>;
  let mockQueryExecutionService: jest.Mocked<QueryExecutionService>;

  beforeEach(() => {
    app = express() as unknown as Application;
    app.use(express.json());

    app.logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    mockDatasetRegistryService = { getPublicSchema: jest.fn() } as any;
    mockQueryExecutionService = { executeBatch: jest.fn() } as any;

    const controller = new DataQueryController(app, mockDatasetRegistryService, mockQueryExecutionService);
    controller.registerRoutes();
  });

  describe(`POST ${API_PATHS.dataQuery}`, () => {
    it('executes the batch and returns one result per query, defaulting to the guest role', async () => {
      const results: WidgetQueryResult[] = [
        { id: 'w1', status: 'ok', rows: [{ status: 'paid' }], meta: { rowCount: 1, executionMs: 5, cached: false } },
      ];

      mockQueryExecutionService.executeBatch.mockResolvedValue(results);

      const requestBody = { queries: [{ id: 'w1', dataset: 'orders', dimensions: ['status'] }] };

      const response = await request(app).post(API_PATHS.dataQuery).send(requestBody);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual({ results });
      expect(mockQueryExecutionService.executeBatch).toHaveBeenCalledWith(requestBody.queries, {
        role: RoleTypes.Guest,
      });
    });

    it('passes through per-query error results without failing the whole request', async () => {
      const results: WidgetQueryResult[] = [
        { id: 'w1', status: 'error', error: { code: 'UNKNOWN_DATASET', message: 'Unknown dataset "nope"' } },
      ];

      mockQueryExecutionService.executeBatch.mockResolvedValue(results);

      const response = await request(app)
        .post(API_PATHS.dataQuery)
        .send({ queries: [{ id: 'w1', dataset: 'nope' }] });

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual({ results });
    });
  });

  describe(`GET ${API_PATHS.dataQuerySchema}`, () => {
    it('returns the public dataset schema for the guest role', async () => {
      const schema = [{ name: 'orders', dimensions: {}, measures: {}, maxLimit: 1000 }];

      mockDatasetRegistryService.getPublicSchema.mockReturnValue(schema);

      const response = await request(app).get(API_PATHS.dataQuerySchema);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual({ datasets: schema });
      expect(mockDatasetRegistryService.getPublicSchema).toHaveBeenCalledWith(RoleTypes.Guest);
    });
  });
});
