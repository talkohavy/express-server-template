import { API_PATHS } from '@src/common/constants';
import type { Application, NextFunction, Request, Response } from 'express';
import type { MiddlewareFactory } from '@src/lib/lucky-server';

export class AuthenticationMiddleware implements MiddlewareFactory {
  constructor(private readonly app: Application) {}

  use() {
    this.app.use(API_PATHS.auth, this.apply);
  }

  apply(_req: Request, _res: Response, next: NextFunction) {
    console.log('authentication middleware');

    next();
  }
}
