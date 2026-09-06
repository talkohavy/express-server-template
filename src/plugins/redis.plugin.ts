import { RedisConnection, type RedisConfig } from '@src/core/connections/redis';
import { ConfigKeys } from './config-service';
import type { Application } from 'express';

/**
 * @dependencies
 * - config-service plugin
 * - logger plugin
 */
export async function redisPlugin(app: Application) {
  const { logger } = app;

  const { connectionString } = app.configService.get<RedisConfig>(ConfigKeys.Redis);

  const pubConnection = new RedisConnection(logger, { connectionString, connectionName: 'pub' });
  const subConnection = new RedisConnection(logger, { connectionString, connectionName: 'sub' });

  const redisPubConnection = pubConnection;
  const redisSubConnection = subConnection;

  await Promise.all([pubConnection.connect(), subConnection.connect()]); // const [pubClient, subClient] =

  app.redis.pub = redisPubConnection.getClient()!;
  app.redis.sub = redisSubConnection.getClient()!;
}
