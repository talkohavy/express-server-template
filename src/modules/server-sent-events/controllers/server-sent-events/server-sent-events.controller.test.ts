import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { SSE_MAX_CONNECTIONS_PER_NODE } from '../../logic/constants';
import { ServerSentEventsController } from './server-sent-events.controller';
import type { SseConnectionLimiterService } from '../../services/sse-connection-limiter';
import type { SseConnectionsService } from '../../services/sse-connections';

describe('ServerSentEventsController', () => {
  let app: Application;
  let sseConnectionsService: { getConnectionsCount: jest.Mock };
  let sseConnectionLimiterService: { acquire: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    app = express() as unknown as Application;

    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 'user-1', role: 'user' };
      next();
    });

    sseConnectionsService = { getConnectionsCount: jest.fn().mockReturnValue(0) };
    sseConnectionLimiterService = { acquire: jest.fn(), release: jest.fn() };

    const controller = new ServerSentEventsController(
      app,
      sseConnectionsService as unknown as SseConnectionsService,
      sseConnectionLimiterService as unknown as SseConnectionLimiterService,
    );
    controller.registerRoutes();

    app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
      res.status(error.statusCode).json({ message: error.message });
    });
  });

  describe(`GET ${API_PATHS.sse}`, () => {
    it('should respond with 503 without acquiring a lease when the node is full', async () => {
      sseConnectionsService.getConnectionsCount.mockReturnValue(SSE_MAX_CONNECTIONS_PER_NODE);

      const response = await request(app).get(API_PATHS.sse);

      expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE);
      expect(sseConnectionLimiterService.acquire).not.toHaveBeenCalled();
    });

    it('should respond with 429 when the user is at their connection limit', async () => {
      sseConnectionLimiterService.acquire.mockResolvedValue(false);

      const response = await request(app).get(API_PATHS.sse);

      expect(response.status).toBe(StatusCodes.TOO_MANY_REQUESTS);
    });
  });
});
