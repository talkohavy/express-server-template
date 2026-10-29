import type { EnvironmentValues } from '@src/common/constants';
import type { LoggerSettings, LogLevelValues } from '@src/lib/logger';
import type { ServiceNameValues } from './logic/constants';

export type AuthCookieConfig = {
  /**
   * In milliseconds
   */
  maxAge: number;
};

export type SingleCookie = {
  name: string;
  isSecure: boolean;
  /**
   * @default 'localhost'
   */
  domain: string;
  /**
   * The browser only sends the cookie to URLs under this path.
   */
  path: `/${string}`;
  /**
   * In milliseconds
   */
  maxAge: number;
};

export type CookiesConfig = {
  accessCookie: SingleCookie;
  refreshCookie: SingleCookie;
};

export type JwtConfig = {
  accessSecret: string;
  refreshSecret: string;
  accessExpireTime: string;
  refreshExpireTime: string;
  issuer: string;
};

export type LoggerServiceSettings = LoggerSettings & {
  /**
   * Used to identify the service in the logs.
   * @default 'my-nest-like-server'
   */
  serviceName?: string;
  /**
   * Used for filtering logs by environment.
   *
   * Examples: 'dev', 'qa', 'prod', 'stg', etc.
   * @default 'dev'
   */
  logEnv?: EnvironmentValues;
};

export type PostgresConfig = {
  connectionString: string;
};

export type ServicesConfig = Record<ServiceNameValues, { baseUrl: string }>;

export type ValidEnv = {
  POSTGRES_CONNECTION_STRING: string;
  REDIS_CONNECTION_STRING: string;
  MICRO_SERVICES_PROTOCOL: 'direct' | 'http' | 'grpc';
  /**
   * Signs and verifies access tokens. At least 32 characters.
   */
  JWT_ACCESS_SECRET: string;
  /**
   * Signs refresh tokens. At least 32 characters, and must differ from JWT_ACCESS_SECRET.
   */
  JWT_REFRESH_SECRET: string;
  PORT: number;
  /**
   * Used to identify the service in the logs.
   * @default 'express-server-template'
   */
  SERVICE_NAME: string;
  LOG_LEVEL: LogLevelValues;
  /**
   * Used for filtering logs by environment.
   *
   * Examples: 'dev', 'qa', 'prod', 'stg', etc.
   * @default 'dev'
   */
  LOG_ENV: EnvironmentValues;
  /**
   * Whether to use pretty print output in the logs.
   * @default false
   */
  USE_PRETTY_PRINT: boolean;
  SHOULD_MIGRATE_POSTGRES: boolean;
  /**
   * The domain to use for the cookies.
   *
   * i.e. '.luckylove.co.il'
   * @default 'localhost'
   */
  DOMAIN: string;
  /**
   * Whether to use secure cookies.
   * @default true
   */
  IS_SECURE: boolean;
  WEBSOCKET_MODULE: 'socket.io' | 'ws' | undefined;
};
