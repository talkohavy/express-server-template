import { RedisConnection, type RedisConfig } from '@src/core/connections/redis';
import { ConfigKeys } from './config-service';
import type { Application } from 'express';

/**
 * @dependencies
 * - config-service plugin
 */
export async function redisPlugin(app: Application) {
  const { connectionString } = app.configService.get<RedisConfig>(ConfigKeys.Redis);

  const pubConnection = new RedisConnection({ connectionString, connectionName: 'pub' });
  const subConnection = new RedisConnection({ connectionString, connectionName: 'sub' });

  const redisPubConnection = pubConnection;
  const redisSubConnection = subConnection;

  await Promise.all([pubConnection.connect(), subConnection.connect()]); // const [pubClient, subClient] =

  app.redis.pub = redisPubConnection.getClient()!;
  app.redis.sub = redisSubConnection.getClient()!;
}
