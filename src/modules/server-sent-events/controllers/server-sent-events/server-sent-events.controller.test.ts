import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { SSE_MAX_CONNECTIONS_PER_NODE } from '../../logic/constants';
import { ServerSentEventsController } from './server-sent-events.controller';
import type { ServerSentEventsService } from '../../services/server-sent-events';
import type { SseConnectionLimiterService } from '../../services/sse-connection-limiter';
import type { RegisterConnectionProps, SseConnectionsService } from '../../services/sse-connections';

const TOKEN_EXP_SECONDS = 1_900_000_000;

describe('ServerSentEventsController', () => {
  let app: Application;
  let sseConnectionsService: {
    getConnectionsCount: jest.Mock;
    isAcceptingConnections: jest.Mock;
    register: jest.Mock;
    unregister: jest.Mock;
    send: jest.Mock;
  };
  let sseConnectionLimiterService: { acquire: jest.Mock; release: jest.Mock };
  let serverSentEventsService: {
    subscribeToUserEvents: jest.Mock;
    subscribeToUserTopics: jest.Mock;
    releaseConnectionSubscriptions: jest.Mock;
    completeTopicsLoad: jest.Mock;
  };

  /**
   * Lets the response's 'close' handler (which releases the connection's resources) run.
   */
  async function waitForCloseHandlers(): Promise<void> {
    await new Promise(setImmediate);
  }

  beforeEach(() => {
    app = express() as unknown as Application;

    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 'user-1', role: 'user', exp: TOKEN_EXP_SECONDS, sid: 'session-1' };
      next();
    });

    sseConnectionsService = {
      getConnectionsCount: jest.fn().mockReturnValue(0),
      isAcceptingConnections: jest.fn().mockReturnValue(true),
      // Ends the stream right away, so the request completes.
      register: jest.fn((props: RegisterConnectionProps) => {
        props.response.end();

        return { socketId: props.socketId };
      }),
      unregister: jest.fn(),
      send: jest.fn(),
    };
    sseConnectionLimiterService = { acquire: jest.fn().mockResolvedValue(true), release: jest.fn() };
    serverSentEventsService = {
      subscribeToUserEvents: jest.fn().mockResolvedValue(true),
      subscribeToUserTopics: jest.fn().mockResolvedValue([]),
      releaseConnectionSubscriptions: jest.fn(),
      completeTopicsLoad: jest.fn(),
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
    it('should open the stream and register the connection with its session and token expiry', async () => {
      const response = await request(app).get(API_PATHS.sse);

      const [{ sessionId, expiresAt }] = sseConnectionsService.register.mock.calls[0];

      expect(response.headers['content-type']).toBe('text/event-stream');
      expect(sessionId).toBe('session-1');
      expect(expiresAt).toBe(TOKEN_EXP_SECONDS * 1000);
    });

    it('should respond with 503 without acquiring a lease when the node is full', async () => {
      sseConnectionsService.getConnectionsCount.mockReturnValue(SSE_MAX_CONNECTIONS_PER_NODE);

      const response = await request(app).get(API_PATHS.sse);

      expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE);
      expect(sseConnectionLimiterService.acquire).not.toHaveBeenCalled();
    });

    it('should respond with 503 without acquiring a lease when the node is shutting down', async () => {
      sseConnectionsService.isAcceptingConnections.mockReturnValue(false);

      const response = await request(app).get(API_PATHS.sse);

      expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE);
      expect(sseConnectionLimiterService.acquire).not.toHaveBeenCalled();
    });

    it('should respond with 503 without registering when shutdown starts while the connection is opening', async () => {
      sseConnectionsService.isAcceptingConnections.mockReturnValueOnce(true).mockReturnValue(false);

      const response = await request(app).get(API_PATHS.sse);
      await waitForCloseHandlers();

      const [{ socketId }] = serverSentEventsService.subscribeToUserEvents.mock.calls[0];

      expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE);
      expect(sseConnectionsService.register).not.toHaveBeenCalled();
      expect(sseConnectionLimiterService.release).toHaveBeenCalledWith({ userId: 'user-1', socketId });
    });

    it('should count connections that are still opening against the per-node limit', async () => {
      sseConnectionsService.getConnectionsCount.mockReturnValue(SSE_MAX_CONNECTIONS_PER_NODE - 1);
      let markFirstAcquireStarted: () => void = () => {};
      let resolveFirstAcquire: (result: boolean) => void = () => {};
      const firstAcquireStarted = new Promise<void>((resolve) => {
        markFirstAcquireStarted = resolve;
      });
      sseConnectionLimiterService.acquire.mockImplementationOnce(async () => {
        markFirstAcquireStarted();

        const result = await new Promise<boolean>((resolve) => {
          resolveFirstAcquire = resolve;
        });

        return result;
      });

      const firstRequest = request(app)
        .get(API_PATHS.sse)
        .then((response) => response);
      await firstAcquireStarted;
      const secondResponse = await request(app).get(API_PATHS.sse);
      resolveFirstAcquire(true);
      await firstRequest;

      expect(secondResponse.status).toBe(StatusCodes.SERVICE_UNAVAILABLE);
      expect(sseConnectionLimiterService.acquire).toHaveBeenCalledTimes(1);
    });

    it('should respond with 429 when the user is at their connection limit', async () => {
      sseConnectionLimiterService.acquire.mockResolvedValue(false);

      const response = await request(app).get(API_PATHS.sse);

      expect(response.status).toBe(StatusCodes.TOO_MANY_REQUESTS);
    });

    it('should respond with 503 and release what it took when subscribing to user events fails', async () => {
      serverSentEventsService.subscribeToUserEvents.mockResolvedValue(false);

      const response = await request(app).get(API_PATHS.sse);
      await waitForCloseHandlers();

      const [{ socketId }] = serverSentEventsService.subscribeToUserEvents.mock.calls[0];

      expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE);
      expect(sseConnectionLimiterService.release).toHaveBeenCalledWith({ userId: 'user-1', socketId });
      expect(serverSentEventsService.releaseConnectionSubscriptions).toHaveBeenCalledWith(socketId);
      expect(serverSentEventsService.subscribeToUserTopics).not.toHaveBeenCalled();
    });

    it('should respond with 503 and release what it took when subscribing to topic events fails', async () => {
      serverSentEventsService.subscribeToUserTopics.mockResolvedValue(null);

      const response = await request(app).get(API_PATHS.sse);
      await waitForCloseHandlers();

      const [{ socketId }] = serverSentEventsService.subscribeToUserTopics.mock.calls[0];

      expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE);
      expect(sseConnectionLimiterService.release).toHaveBeenCalledWith({ userId: 'user-1', socketId });
      expect(serverSentEventsService.releaseConnectionSubscriptions).toHaveBeenCalledWith(socketId);
    });

    it('should unregister and release the connection when its stream closes', async () => {
      await request(app).get(API_PATHS.sse);
      await waitForCloseHandlers();

      const [{ socketId }] = sseConnectionsService.register.mock.calls[0];

      expect(sseConnectionsService.unregister).toHaveBeenCalledWith(socketId);
      expect(sseConnectionLimiterService.release).toHaveBeenCalledWith({ userId: 'user-1', socketId });
    });
  });
});
