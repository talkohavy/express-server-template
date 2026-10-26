import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { SSE_MAX_CONNECTIONS_PER_NODE } from '../../logic/constants';
import { ServerSentEventsController } from './server-sent-events.controller';
import type { ServerSentEventsService } from '../../services/server-sent-events';
import type { SseConnectionLimiterService } from '../../services/sse-connection-limiter';
import type { SseConnectionsService } from '../../services/sse-connections';

describe('ServerSentEventsController', () => {
  let app: Application;
  let sseConnectionsService: { getConnectionsCount: jest.Mock };
  let sseConnectionLimiterService: { acquire: jest.Mock; release: jest.Mock };
  let serverSentEventsService: {
    subscribeToUserEvents: jest.Mock;
    unsubscribeFromUserEvents: jest.Mock;
    subscribeToUserTopics: jest.Mock;
    unsubscribeFromTopics: jest.Mock;
  };

  beforeEach(() => {
    app = express() as unknown as Application;

    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 'user-1', role: 'user' };
      next();
    });

    sseConnectionsService = { getConnectionsCount: jest.fn().mockReturnValue(0) };
    sseConnectionLimiterService = { acquire: jest.fn().mockResolvedValue(true), release: jest.fn() };
    serverSentEventsService = {
      subscribeToUserEvents: jest.fn().mockResolvedValue(true),
      unsubscribeFromUserEvents: jest.fn(),
      subscribeToUserTopics: jest.fn().mockResolvedValue([]),
      unsubscribeFromTopics: jest.fn(),
    };

    const controller = new ServerSentEventsController(
      app,
      sseConnectionsService as unknown as SseConnectionsService,
      sseConnectionLimiterService as unknown as SseConnectionLimiterService,
      serverSentEventsService as unknown as ServerSentEventsService,
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

    it('should respond with 503 and release what it took when subscribing to user events fails', async () => {
      serverSentEventsService.subscribeToUserEvents.mockResolvedValue(false);

      const response = await request(app).get(API_PATHS.sse);

      expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE);
      expect(sseConnectionLimiterService.release).toHaveBeenCalledWith({
        userId: 'user-1',
        socketId: expect.any(String),
      });
      expect(serverSentEventsService.unsubscribeFromUserEvents).toHaveBeenCalledWith('user-1');
      expect(serverSentEventsService.subscribeToUserTopics).not.toHaveBeenCalled();
    });

    it('should respond with 503 and release what it took when subscribing to topic events fails', async () => {
      serverSentEventsService.subscribeToUserTopics.mockResolvedValue(null);

      const response = await request(app).get(API_PATHS.sse);

      expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE);
      expect(sseConnectionLimiterService.release).toHaveBeenCalledWith({
        userId: 'user-1',
        socketId: expect.any(String),
      });
      expect(serverSentEventsService.unsubscribeFromUserEvents).toHaveBeenCalledWith('user-1');
      expect(serverSentEventsService.unsubscribeFromTopics).toHaveBeenCalledWith([]);
    });
  });
});
