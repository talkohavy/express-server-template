import type { Server as HttpServer } from 'http';
import type { Client as PgClient } from 'pg';
import type { RedisClientType } from 'redis';
import type { Server as SocketIOServer } from 'socket.io';
import type { WebSocketServer } from 'ws';
import type { CallContextService } from '@src/core/services/call-context';
import type { ConfigService } from '@src/core/services/config';
import type { LoggerService } from '@src/core/services/logger';
import type { TopicPublisherService } from '@src/core/services/topic-publisher';
import type { TopicSubscriberService } from '@src/core/services/topic-subscriber';
import type { AuthenticationModule } from '@src/modules/authentication';
import type { BooksModule } from '@src/modules/books';
import type { DragonsModule } from '@src/modules/dragons';
import type { FileUploadModule } from '@src/modules/file-upload';
import type { HealthCheckModule } from '@src/modules/health-check';
import type { RedisDebugModule } from '@src/modules/redis-debug';
import type { SwaggerModule } from '@src/modules/swagger';
import type { UsersModule } from '@src/modules/users';
import type { WsModule } from '@src/modules/ws';

export interface OptimizedApp {
  modules: {
    AuthenticationModule: AuthenticationModule;
    HealthCheckModule: HealthCheckModule;
    UsersModule: UsersModule;
    BooksModule: BooksModule;
    DragonsModule: DragonsModule;
    FileUploadModule: FileUploadModule;
    RedisDebugModule: RedisDebugModule;
    WsModule: WsModule;
    SwaggerModule: SwaggerModule;
  };
  configService: ConfigService;
  callContextService: CallContextService;
  redis: {
    pub: RedisClientType;
    sub: RedisClientType;
  };
  pg: PgClient;
  logger: LoggerService;
  httpServer: HttpServer;
  socketIOApp: SocketIOServer;
  wsApp: WebSocketServer;
  topicSubscriber: TopicSubscriberService;
  topicPublisher: TopicPublisherService;
}
