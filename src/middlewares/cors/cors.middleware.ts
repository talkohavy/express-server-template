import cors from 'cors';
import { Environment, type EnvironmentValues } from '@src/common/constants';
import { ConfigKeys } from '@src/plugins/config-service';
import { handleCors } from './logic/utils/handleCors';
import type { Application } from 'express';

/**
 * @express
 *
 * @dependencies
 * - config-service plugin
 */
export function registerCorsMiddleware(app: Application) {
  const isDev = app.configService.get<boolean>(ConfigKeys.IsDev);

  const environment = isDev ? Environment.Dev : Environment.Prod;

  const middleware = corsMiddleware(environment);

  app.use(middleware);
}

function corsMiddleware(environment: EnvironmentValues) {
  return cors({
    origin: handleCors(environment),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true, // <--- Important! You'll get CORS Error without it.
  });
}
