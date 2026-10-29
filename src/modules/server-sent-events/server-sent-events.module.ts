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
 * - sse-topics plugin
 */
export class ServerSentEventsModule implements ModuleFactory {
  private sseConnectionsService!: SseConnectionsService;
  private sseConnectionLimiterService!: SseConnectionLimiterService;
  private serverSentEventsService!: ServerSentEventsService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    const { logger, redis, sseTopics } = this.app;
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
      sseTopics,
    );

    this.sseConnectionLimiterService.start();

    // SSE always attaches routes directly - clients connect to this endpoint
    // without going through the BFF (persistent connections don't proxy well)
    this.attachControllers();
  }

  /**
   * Call on shutdown.
   * 1. Refuses connections that are still opening, so none registers after the others were closed.
   * 2. Unsubscribes from Redis, so nothing new is fanned out.
   * 3. Releases every lease at once, while Redis is still connected (the process may exit before each connection's own release).
   * 4. Closes all connections.
   */
  async cleanup(): Promise<void> {
    this.sseConnectionsService.stopAcceptingConnections();

    await this.serverSentEventsService.cleanup();

    this.sseConnectionLimiterService.stop();

    await this.sseConnectionLimiterService.releaseAll();

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
