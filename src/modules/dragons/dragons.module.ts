import { DragonsCrudController } from './controllers/dragons-crud/dragons-crud.controller';
import { DragonsService } from './services/dragons';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

export class DragonsModule implements ModuleFactory {
  private dragonsService!: DragonsService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    this.dragonsService = new DragonsService(this.app.redis.pub);

    // Only attach routes if running as a standalone micro-service
    if (process.env.IS_STANDALONE_MICRO_SERVICES) {
      this.attachControllers();
    }
  }

  private attachControllers(): void {
    const dragonsCrudController = new DragonsCrudController(this.app, this.dragonsService);

    dragonsCrudController.registerRoutes();
  }

  get services() {
    return {
      dragonsService: this.dragonsService,
    };
  }
}
