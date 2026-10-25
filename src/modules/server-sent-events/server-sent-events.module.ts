import { ConfigKeys, type JwtConfig } from '@src/plugins/config-service';
import { TokenVerificationService } from '../authentication/services/token-verification';
import { ServerSentEventsController } from './controllers';
import { SseAuthenticationMiddleware } from './middleware/sse-authentication.middleware';
import {
  ServerSentEventsService,
  SseChannelSubscriberService,
  SseConnectionLimiterService,
  SseConnectionsService,
} from './services';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

/**
 * @dependencies
 * - config-service plugin
 * - logger plugin
 * - redis plugin
 * - sse-publisher plugin
 */
export class ServerSentEventsModule implements ModuleFactory {
  private sseConnectionsService!: SseConnectionsService;
  private sseConnectionLimiterService!: SseConnectionLimiterService;
  private serverSentEventsService!: ServerSentEventsService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    const { logger, configService, redis, ssePublisher } = this.app;
    const { pub: redisPubClient, sub: redisSubClient } = redis;

    this.sseConnectionsService = new SseConnectionsService(logger);
    this.sseConnectionLimiterService = new SseConnectionLimiterService(
      logger,
      this.sseConnectionsService,
      redisPubClient,
    );
    const sseChannelSubscriberService = new SseChannelSubscriberService(logger, redisSubClient);
    this.serverSentEventsService = new ServerSentEventsService(
      logger,
      this.sseConnectionsService,
      sseChannelSubscriberService,
      ssePublisher,
      redisSubClient,
    );

    await this.serverSentEventsService.subscribeToEvents();

    this.sseConnectionLimiterService.start();

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

    this.sseConnectionLimiterService.stop();

    // Each closing connection releases its own lease, so this must run while Redis is still connected.
    await this.sseConnectionsService.closeAllConnections();
  }

  private attachControllers(): void {
    const jwtConfig = this.app.configService.get<JwtConfig>(ConfigKeys.Jwt);

    const tokenVerificationService = new TokenVerificationService(jwtConfig);

    const sseAuthenticationMiddleware = new SseAuthenticationMiddleware(this.app, tokenVerificationService);
    const serverSentEventsController = new ServerSentEventsController(
      this.app,
      this.sseConnectionsService,
      this.sseConnectionLimiterService,
      this.serverSentEventsService,
    );

    sseAuthenticationMiddleware.use();
    serverSentEventsController.registerRoutes();
  }

  get services() {
    return {
      sseConnectionsService: this.sseConnectionsService,
      sseConnectionLimiterService: this.sseConnectionLimiterService,
      serverSentEventsService: this.serverSentEventsService,
    };
  }
}
