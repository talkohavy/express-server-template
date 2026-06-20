import { validateEnvVariables } from './utils/validateEnvVariables';
import type { Config } from './constants';

export function configuration(): Config {
  const env = validateEnvVariables();

  return {
    port: env.PORT,
    isDev: env.IS_DEV,
    isCI: env.IS_CI,
    authCookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
    jwt: {
      accessSecret: '1234',
      accessExpireTime: '1h',
      refreshSecret: '1234',
      refreshExpireTime: '1d',
      issuer: 'luckylove',
    },
    cookies: {
      accessCookie: {
        name: 'access_token',
        domain: env.DOMAIN,
        maxAge: 60 * 60 * 1000, // 1 hour
      },
      refreshCookie: {
        name: 'refresh_token',
        domain: env.DOMAIN,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      },
    },
    logSettings: {
      serviceName: env.SERVICE_NAME,
      logLevel: env.LOG_LEVEL,
      logEnv: env.LOG_ENV,
      useColoredOutput: env.USE_COLORS,
    },
    postgres: {
      connectionString: env.POSTGRES_CONNECTION_STRING,
    },
    redis: {
      connectionString: env.REDIS_CONNECTION_STRING,
    },
  };
}
