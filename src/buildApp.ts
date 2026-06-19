import { optimizedApp } from '@src/common/constants';
import { AppFactory } from '@src/lib/lucky-server';
import { registerBodyLimitMiddleware } from './middlewares/bodyLimit.middleware';
import { registerCookieParserMiddleware } from './middlewares/cookieParser.middleware';
import { registerCorsMiddleware } from './middlewares/cors';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { registerFetchPermissionsMiddleware } from './middlewares/fetch-permissions.middleware';
import { registerHelmetMiddleware } from './middlewares/helmet.middleware';
import { pathNotFoundHandler } from './middlewares/pathNotFoundHandler.middleware';
import { registerAddRequestIdHeaderMiddleware } from './middlewares/request-id.middleware';
import { registerUrlEncodedMiddleware } from './middlewares/urlEncoded.middleware';
import { AuthenticationModule } from './modules/authentication';
import { BackendModule } from './modules/backend';
import { BooksModule } from './modules/books';
import { DragonsModule } from './modules/dragons';
import { FileUploadModule } from './modules/file-upload';
import { HealthCheckModule } from './modules/health-check';
import { MetricsModule } from './modules/metrics';
import { RedisDebugModule } from './modules/redis-debug';
// import { ServerSentEventModule } from './modules/serverSentEvents';
import { SocketIOModule } from './modules/socketio';
import { SwaggerModule } from './modules/swagger';
import { UsersModule } from './modules/users';
import { WsModule } from './modules/ws';
import { callContextPlugin } from './plugins/call-context.plugin';
import { configServicePlugin } from './plugins/config-service';
import { httpServerPlugin } from './plugins/http-server.plugin';
import { loggerPlugin } from './plugins/logger.plugin';
import { metricsPlugin } from './plugins/metrics.plugin';
import { postgresPlugin } from './plugins/postgres.plugin';
import { redisPlugin } from './plugins/redis.plugin';
import { socketIOPlugin } from './plugins/socket.io.plugin';
import { topicPublisherPlugin } from './plugins/topic-publisher.plugin';
import { topicSubscriberPlugin } from './plugins/topic-subscriber.plugin';
import { wsPlugin } from './plugins/ws.plugin';
import type { Application } from 'express';

const websocketModule = process.env.WEBSOCKET_MODULE;
const isSocketIOModuleEnabled = websocketModule === 'socket.io';
const isWsModuleEnabled = websocketModule === 'ws';

export async function buildApp(app: Application) {
  const appModule = new AppFactory(app, optimizedApp);

  await appModule.registerPlugins([
    configServicePlugin,
    callContextPlugin,
    loggerPlugin,
    metricsPlugin,
    postgresPlugin,
    redisPlugin,
    httpServerPlugin,
    topicPublisherPlugin,
    topicSubscriberPlugin,
    isSocketIOModuleEnabled && socketIOPlugin,
    isWsModuleEnabled && wsPlugin,
  ]);

  await appModule.registerMiddleware([
    registerAddRequestIdHeaderMiddleware,
    registerCorsMiddleware,
    registerHelmetMiddleware,
    registerBodyLimitMiddleware,
    registerUrlEncodedMiddleware,
    registerCookieParserMiddleware,
    registerFetchPermissionsMiddleware,
  ]);

  await appModule.registerModules([
    // - Main modules (service providers)
    HealthCheckModule,
    MetricsModule,
    AuthenticationModule,
    UsersModule,
    BooksModule,
    DragonsModule,
    FileUploadModule,
    isSocketIOModuleEnabled && SocketIOModule, // <--- To make the SocketIO module work, make sure you comment out the wsPlugin above, and the WsModule below. Otherwise, you will get the error of "Invalid frame header".
    isWsModuleEnabled && WsModule,
    isWsModuleEnabled && RedisDebugModule,
    // - BFF module (route provider) - requires Main modules to be ready
    BackendModule,
    // - Utility modules
    // ServerSentEventModule,
    SwaggerModule,
  ]);

  appModule.registerErrorHandler(errorHandler);
  appModule.registerPathNotFoundHandler(pathNotFoundHandler);
}
