import type { RedisConfig } from '@src/core/connections/redis';
import type {
  AuthCookieConfig,
  CookiesConfig,
  CorsConfig,
  JwtConfig,
  LoggerServiceSettings,
  PostgresConfig,
  RefreshTokenConfig,
} from '../types';

export const ConfigKeys = {
  Port: 'port',
  ExposeInternalErrors: 'exposeInternalErrors',
  AuthCookie: 'authCookie',
  Cookies: 'cookies',
  Cors: 'cors',
  Jwt: 'jwt',
  RefreshToken: 'refreshToken',
  LogSettings: 'logSettings',
  Postgres: 'postgres',
  Redis: 'redis',
  Services: 'services',
} as const;

export type ConfigKeyValues = (typeof ConfigKeys)[keyof typeof ConfigKeys];

export type Config = {
  [ConfigKeys.Port]: number;
  [ConfigKeys.ExposeInternalErrors]: boolean;
  [ConfigKeys.AuthCookie]: AuthCookieConfig;
  [ConfigKeys.Cookies]: CookiesConfig;
  [ConfigKeys.Cors]: CorsConfig;
  [ConfigKeys.Jwt]: JwtConfig;
  [ConfigKeys.RefreshToken]: RefreshTokenConfig;
  [ConfigKeys.LogSettings]: LoggerServiceSettings;
  [ConfigKeys.Postgres]: PostgresConfig;
  [ConfigKeys.Redis]: Partial<RedisConfig>;
};

export const ServiceNames = {
  Auth: 'auth',
  Users: 'users',
  Books: 'books',
  Dragons: 'dragons',
  FileUpload: 'file-upload',
  FeatureFlags: 'feature-flags',
} as const;

export type ServiceNameValues = (typeof ServiceNames)[keyof typeof ServiceNames];
