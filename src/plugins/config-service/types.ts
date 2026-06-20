import type { EnvironmentValues } from '@src/common/constants';
import type { LoggerSettings, LogLevelValues } from '@src/lib/logger';
import type { ServiceNameValues } from './logic/constants';

export type AuthCookieConfig = {
  /**
   * In milliseconds
   */
  maxAge: number;
};

type SingleCookie = {
  name: string;
  domain: string;
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
  serviceName?: string;
  logEnvironment?: EnvironmentValues;
};

export type PostgresConfig = {
  connectionString: string;
};

export type ServicesConfig = Record<ServiceNameValues, { baseUrl: string }>;

export type ValidEnv = {
  PORT: number;
  MICRO_SERVICES_PROTOCOL: 'direct' | 'http' | 'grpc';
  IS_DEV: boolean;
  IS_CI: boolean;
  /**
   * The domain to use for the cookies.
   *
   * i.e. '.luckylove.co.il'
   */
  DOMAIN: string;
  LOG_LEVEL: LogLevelValues;
  /**
   * Whether to use colored output in the logs.
   * @default false
   */
  USE_COLORS: boolean;
  /**
   * Used to identify the service in the logs.
   */
  SERVICE_NAME: string;
  NODE_ENV: string | undefined;
  POSTGRES_CONNECTION_STRING: string;
  REDIS_CONNECTION_STRING: string;
  SHOULD_MIGRATE_POSTGRES: boolean;
  WEBSOCKET_MODULE: 'socket.io' | 'ws' | undefined;
};
