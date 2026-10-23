import { ServerSentEventsController } from './controllers/server-sent-events.controller';
import { ServerSentEventsService } from './services/server-sent-events.service';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

/**
 * @dependencies
 * - redis plugin
 * - logger plugin
 */
export class ServerSentEventModule implements ModuleFactory {
  private serverSentEventsService!: ServerSentEventsService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    const { pub: redisPubClient, sub: redisSubClient } = this.app.redis;

    this.serverSentEventsService = new ServerSentEventsService(this.app.logger, redisPubClient, redisSubClient);

    // SSE always attaches routes directly - clients connect to this endpoint
    // without going through the BFF (persistent connections don't proxy well)
    this.attachControllers();
  }

  private attachControllers(): void {
    const controller = new ServerSentEventsController(this.app, this.serverSentEventsService);

    controller.registerRoutes();

    this.serverSentEventsService.runSimulation();
  }
}
