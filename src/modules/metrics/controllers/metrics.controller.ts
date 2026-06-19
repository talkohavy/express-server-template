import { API_PATHS } from '@src/common/constants';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';

export class MetricsController implements ControllerFactory {
  constructor(private readonly app: Application) {}

  registerRoutes() {
    this.getMetrics();
  }

  private getMetrics() {
    const registry = this.app.metrics.registry;

    this.app.get(API_PATHS.metrics, async (_req: Request, res: Response) => {
      const metrics = await registry.metrics();

      res.set('Content-Type', registry.contentType);
      res.end(metrics);
    });
  }
}
