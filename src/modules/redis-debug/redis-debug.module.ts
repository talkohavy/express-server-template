import { WsStateController } from './controllers/ws-state';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

export class RedisDebugModule implements ModuleFactory {
  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    const wsStateController = new WsStateController(this.app);

    wsStateController.registerRoutes();
  }
}
