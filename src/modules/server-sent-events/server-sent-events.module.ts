import { ConfigKeys, type JwtConfig } from '@src/plugins/config-service';
import { TokenVerificationService } from '../authentication/services/token-verification';
import { ServerSentEventsController } from './controllers';
import { SseAuthenticationMiddleware } from './middleware/sse-authentication.middleware';
import { ServerSentEventsService, SseConnectionsService } from './services';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

/**
 * @dependencies
 * - config-service plugin
 * - logger plugin
 * - redis plugin
 */
export class ServerSentEventsModule implements ModuleFactory {
  private sseConnectionsService!: SseConnectionsService;
  private serverSentEventsService!: ServerSentEventsService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    const { logger, configService, redis } = this.app;
    const { pub: redisPubClient, sub: redisSubClient } = redis;

    this.sseConnectionsService = new SseConnectionsService(logger);
    this.serverSentEventsService = new ServerSentEventsService(
      logger,
      this.sseConnectionsService,
      redisPubClient,
      redisSubClient,
    );

    await this.serverSentEventsService.subscribeToEvents();

    // SSE always attaches routes directly - clients connect to this endpoint
    // without going through the BFF (persistent connections don't proxy well)
    this.attachControllers();

    const isDev = configService.get<boolean>(ConfigKeys.IsDev);

    if (isDev && process.env.SSE_SIMULATION === 'true') {
      this.serverSentEventsService.startSimulation();
    }
  }

  /**
   * Call on shutdown. Unsubscribes from Redis first so nothing new is fanned out, then closes all connections.
   */
  async cleanup(): Promise<void> {
    await this.serverSentEventsService.cleanup();

    await this.sseConnectionsService.closeAllConnections();
  }

  private attachControllers(): void {
    const jwtConfig = this.app.configService.get<JwtConfig>(ConfigKeys.Jwt);

    const tokenVerificationService = new TokenVerificationService(jwtConfig);

    const sseAuthenticationMiddleware = new SseAuthenticationMiddleware(this.app, tokenVerificationService);
    const serverSentEventsController = new ServerSentEventsController(this.app, this.sseConnectionsService);

    sseAuthenticationMiddleware.use();
    serverSentEventsController.registerRoutes();
  }

  get services() {
    return {
      sseConnectionsService: this.sseConnectionsService,
      serverSentEventsService: this.serverSentEventsService,
    };
  }
}
