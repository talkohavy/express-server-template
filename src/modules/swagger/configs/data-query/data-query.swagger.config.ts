import { addRequestBody, createApiRoute, createSwaggerApiDocs } from 'api-opener';
import { API_PATHS } from '@src/common/constants';
import { AbstractSwaggerConfig } from '../../logic/swagger.abstract.config';
import type { SwaggerObjectFormat } from 'api-opener';

const widgetQueryProperties: SwaggerObjectFormat = {
  type: 'object',
  required: ['id', 'dataset'],
  properties: {
    id: { type: 'string' },
    dataset: { type: 'string', example: 'orders' },
    dimensions: { type: 'array', items: { type: 'string' } },
    measures: { type: 'array', items: { type: 'string' } },
    filters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          operator: {
            type: 'string',
            enum: ['eq', 'ne', 'in', 'notIn', 'gt', 'gte', 'lt', 'lte', 'between'],
          },
        },
      },
    },
    timeRange: {
      type: 'object',
      properties: {
        from: { type: 'string', format: 'date-time' },
        to: { type: 'string', format: 'date-time' },
        granularity: { type: 'string', enum: ['day', 'week', 'month'] },
      },
    },
    sort: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          direction: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
    },
    limit: { type: 'integer' },
    offset: { type: 'integer' },
  },
};

const widgetQueryResultProperties: SwaggerObjectFormat = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    status: { type: 'string', enum: ['ok', 'error'] },
    rows: { type: 'array', items: { type: 'object', properties: {} } },
    meta: {
      type: 'object',
      properties: {
        rowCount: { type: 'integer' },
        executionMs: { type: 'integer' },
        cached: { type: 'boolean' },
      },
    },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

export class DataQuerySwaggerConfig extends AbstractSwaggerConfig {
  constructor() {
    super('DataQuery');

    this.docs = createSwaggerApiDocs({
      title: 'LuckyLove: data-query-service',
      baseUrl: 'http://localhost:8000',
      definitions: {},
      routes: [
        createApiRoute({
          method: 'post',
          route: API_PATHS.dataQuery,
          summary: 'Execute a batch of declarative widget queries against the dataset registry',
          operationId: 'execute-data-queries',
          requestBody: addRequestBody({
            isRequired: true,
            requiredFields: ['queries'],
            properties: {
              queries: { type: 'array', items: widgetQueryProperties },
            },
          }),
          responses: {
            '200': {
              description: 'One result per requested widget query, in the same order, each with its own status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      results: { type: 'array', items: widgetQueryResultProperties },
                    },
                  },
                },
                'application/x-www-form-urlencoded': {},
              },
            },
          },
        }),
        createApiRoute({
          method: 'get',
          route: API_PATHS.dataQuerySchema,
          summary: 'Get the public dataset schema (dimensions/measures) for building widget queries',
          operationId: 'get-data-query-schema',
          responses: {
            '200': {
              description: 'The list of datasets visible to the caller, with their dimensions and measures',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      datasets: { type: 'array', items: { type: 'object', properties: {} } },
                    },
                  },
                },
                'application/x-www-form-urlencoded': {},
              },
            },
          },
        }),
      ],
    });
  }
}
