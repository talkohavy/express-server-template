import { MetricsController } from './controllers';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

export class MetricsModule implements ModuleFactory {
  constructor(private readonly app: Application) {}

  async init() {
    const controller = new MetricsController(this.app);

    controller.registerRoutes();
  }
}
