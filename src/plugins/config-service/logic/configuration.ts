import { validateEnvVariables } from './utils/validateEnvVariables';
import type { Config } from './constants';

export function configuration(): Config {
  const env = validateEnvVariables();

  return {
    port: env.PORT,
    authCookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessExpireTime: '1h',
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshExpireTime: '1d',
      issuer: 'luckylove',
    },
    cookies: {
      accessCookie: {
        name: 'access_token',
        domain: env.DOMAIN,
        path: '/',
        maxAge: 60 * 60 * 1000, // 1 hour
        isSecure: env.IS_SECURE,
      },
      refreshCookie: {
        name: 'refresh_token',
        domain: env.DOMAIN,
        path: '/',
        isSecure: env.IS_SECURE,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      },
    },
    logSettings: {
      serviceName: env.SERVICE_NAME,
      logLevel: env.LOG_LEVEL,
      logEnv: env.LOG_ENV,
      usePrettyPrint: env.USE_PRETTY_PRINT,
    },
    postgres: {
      connectionString: env.POSTGRES_CONNECTION_STRING,
    },
    redis: {
      connectionString: env.REDIS_CONNECTION_STRING,
    },
  };
}
