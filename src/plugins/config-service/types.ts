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
   * When undefined, the cookie is host-only (sent only to the exact host that set it).
   */
  domain?: string;
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

export type CorsConfig = {
  /**
   * When true, only origins listed exactly in `ALLOWED_DOMAINS` pass.
   * When false, any subdomain of `DOMAIN_REGEX` passes as well (e.g. preview deployments).
   */
  isStrict: boolean;
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
   * Should be `undefined` in development, and a must-be-set-string value in production.
   *
   * The domain to use for the cookies.
   *
   * i.e. '.luckylove.co.il'
   *
   * When not set, cookies are host-only.
   */
  DOMAIN?: string;
  /**
   * Whether to use secure cookies.
   * @default true
   */
  IS_SECURE: boolean;
  /**
   * Should be `true` in production, and `false` in development.
   *
   * Whether CORS accepts only the exact allowed origins, rather than also any subdomain of the main domain.
   * @default true
   */
  IS_STRICT_CORS: boolean;
  /**
   * Should be `true` in development, and `false` in production.
   *
   * Whether a failed call between micro-services returns its raw error message to the client,
   * instead of a generic one. Raw messages can leak internal details (hosts, ports, stack info).
   * @default false
   */
  EXPOSE_INTERNAL_ERRORS: boolean;
  WEBSOCKET_MODULE: 'socket.io' | 'ws' | undefined;
};
