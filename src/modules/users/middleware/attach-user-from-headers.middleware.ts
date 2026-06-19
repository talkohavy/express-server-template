import { API_PATHS } from '@src/common/constants';
import { attachUserFromHeadersMiddleware } from '@src/middlewares/attach-user-from-headers.middleware';
import type { Application } from 'express';
import type { MiddlewareFactory } from '@src/lib/lucky-server';

/**
 * Only applied when UsersModule is in standalone mode.
 * i.e. when IS_STANDALONE_MICRO_SERVICES is set, and users module is running as a standalone server.
 * In Direct mode, the request is forwarded directly from the BFF to the UsersCrudService.
 */
export class AttachUserFromHeadersMiddleware implements MiddlewareFactory {
  constructor(private readonly app: Application) {}

  use() {
    this.app.use(API_PATHS.users, attachUserFromHeadersMiddleware);
  }
}
