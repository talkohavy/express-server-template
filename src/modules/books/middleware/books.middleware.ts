import { API_PATHS } from '@src/common/constants';
import type { Application, NextFunction, Request, Response } from 'express';
import type { MiddlewareFactory } from '@src/lib/lucky-server';

export class BooksMiddleware implements MiddlewareFactory {
  constructor(private readonly app: Application) {}

  use() {
    this.app.use(API_PATHS.books, this.apply);
  }

  apply(_req: Request, _res: Response, next: NextFunction) {
    this.app.logger.log('Books middleware');

    next();
  }
}
