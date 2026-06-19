import { API_PATHS } from '@src/common/constants';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';

export class SessionManagementController implements ControllerFactory {
  constructor(private readonly app: Application) {}

  registerRoutes() {
    this.logout();
  }

  private logout() {
    this.app.get(API_PATHS.authLogout, async (_req: Request, res: Response) => {
      this.app.logger.info(`GET ${API_PATHS.authLogout} - user logout`);

      // maybe blacklist token here

      res.json({});
    });
  }
}
