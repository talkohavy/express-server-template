import { HealthCheckController } from './controllers/health-check.controller';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

export class HealthCheckModule implements ModuleFactory {
  constructor(private readonly app: Application) {}

  async init() {
    const controller = new HealthCheckController(this.app);

    controller.registerRoutes();
  }
}
