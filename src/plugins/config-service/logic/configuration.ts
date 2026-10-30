import { API_PATHS } from '@src/common/constants';
import { validateEnvVariables } from './utils/validateEnvVariables';
import type { Config } from './constants';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function configuration(): Config {
  const env = validateEnvVariables();

  return {
    port: env.PORT,
    exposeInternalErrors: env.EXPOSE_INTERNAL_ERRORS,
    authCookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessTokenTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
      issuer: 'luckylove',
    },
    refreshToken: {
      ttlMs: REFRESH_TOKEN_TTL_MS,
      sessionMaxAgeMs: SESSION_MAX_AGE_MS,
    },
    cookies: {
      accessCookie: {
        name: 'access_token',
        domain: env.DOMAIN,
        path: '/',
        isSecure: env.IS_SECURE,
      },
      refreshCookie: {
        name: 'refresh_token',
        domain: env.DOMAIN,
        path: API_PATHS.auth, // <--- Sent only to the auth routes (refresh & logout), not on every request.
        isSecure: env.IS_SECURE,
      },
    },
    cors: {
      isStrict: env.IS_STRICT_CORS,
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
