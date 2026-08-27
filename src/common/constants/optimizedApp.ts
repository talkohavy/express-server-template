import type { OptimizedApp } from '../types';

/**
 * Pre-defined object structure for V8 shape optimization.
 */
export const optimizedApp: OptimizedApp = {
  modules: {
    AuthenticationModule: null as any,
    HealthCheckModule: null as any,
    MetricsModule: null as any,
    UsersModule: null as any,
    BooksModule: null as any,
    DataQueryModule: null as any,
    DragonsModule: null as any,
    FileUploadModule: null as any,
    WsModule: null as any,
    RedisDebugModule: null as any,
    SwaggerModule: null as any,
  },
  metrics: null as any,
  configService: null as any,
  redis: {
    pub: null as any,
    sub: null as any,
  },
  pg: null as any,
  kysely: null as any,
  logger: null as any,
  callContextService: null as any,
  httpServer: null as any,
  socketIOApp: null as any,
  wsApp: null as any,
  topicSubscriber: null as any,
  topicPublisher: null as any,
};
