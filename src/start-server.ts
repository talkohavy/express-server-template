import { hostname } from 'os';
import { COLORS } from 'color-my-json';
import express, { type Application } from 'express';
import { buildApp } from './buildApp';
import { registerProcessHandlers } from './common/register-process-handlers';
import { ConfigKeys } from './plugins/config-service';

startServer();

async function startServer() {
  const app = express() as unknown as Application;
  app.disable('x-powered-by');

  await buildApp(app);

  const PORT = app.configService.get<number>(ConfigKeys.Port);

  console.log(`${COLORS.green}Open in browser: ${COLORS.blue}http://localhost:${PORT}${COLORS.stop}`);

  // WARNING!!! DO NOT LISTEN USING APP! While this doesn't affect normal routes, it does affect socketIO routes, They will not be able to connect.
  app.httpServer.listen(PORT, () => {
    const podHostname = hostname();
    const podId = `${podHostname.split('-').slice(-1)[0] || podHostname.substring(0, 8)}-${process.pid}`;

    app.logger.log(`🚀 server is up and running on port ${PORT} | Pod: ${podId} | Hostname: ${podHostname}`);
    app.logger.log('🔗 Redis adapter configured for Socket.IO multi-node support with robust connections');
  });

  app.httpServer.on('error', (error: Error) => {
    app.logger.error(error.message, { error });

    process.exit(1);
  });

  registerProcessHandlers(app);
}
