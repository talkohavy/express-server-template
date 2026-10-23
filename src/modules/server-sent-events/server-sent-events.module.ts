import { ConfigKeys } from '@src/plugins/config-service';
import { ServerSentEventsController } from './controllers';
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

  private attachControllers(): void {
    const serverSentEventsController = new ServerSentEventsController(this.app, this.sseConnectionsService);

    serverSentEventsController.registerRoutes();
  }

  get services() {
    return {
      sseConnectionsService: this.sseConnectionsService,
      serverSentEventsService: this.serverSentEventsService,
    };
  }
}
