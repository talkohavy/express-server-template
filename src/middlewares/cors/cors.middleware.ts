import cors from 'cors';
import { ConfigKeys, type CorsConfig } from '@src/plugins/config-service';
import { handleCors } from './logic/utils/handleCors';
import type { Application } from 'express';

/**
 * @express
 *
 * @dependencies
 * - config-service plugin
 */
export function registerCorsMiddleware(app: Application) {
  const { isStrict } = app.configService.get<CorsConfig>(ConfigKeys.Cors);

  const middleware = corsMiddleware(isStrict);

  app.use(middleware);
}

function corsMiddleware(isStrict: boolean) {
  return cors({
    origin: handleCors(isStrict),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true, // <--- Important! You'll get CORS Error without it.
  });
}
