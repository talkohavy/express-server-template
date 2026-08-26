import { BooksSwaggerConfig } from './configs/books/books.swagger.config';
import { DataQuerySwaggerConfig } from './configs/data-query/data-query.swagger.config';
import { UsersSwaggerConfig } from './configs/users/users.swagger.config';
import { SwaggerController } from './controllers';
import { SwaggerService } from './services/swagger.service';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

/**
 * Docs can be found under the `/api/docs` route.
 */
export class SwaggerModule implements ModuleFactory {
  private swaggerService!: SwaggerService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    this.swaggerService = new SwaggerService([UsersSwaggerConfig, BooksSwaggerConfig, DataQuerySwaggerConfig]);

    this.attachControllers();
  }

  private attachControllers(): void {
    const swaggerController = new SwaggerController(this.app, this.swaggerService);

    swaggerController.registerRoutes();
  }

  get services() {
    return {
      swaggerService: this.swaggerService,
    };
  }
}
