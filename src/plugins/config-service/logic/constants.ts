import type { RedisConfig } from '@src/core/connections/redis';
import type { AuthCookieConfig, CookiesConfig, JwtConfig, LoggerServiceSettings, PostgresConfig } from '../types';

export const ConfigKeys = {
  Port: 'port',
  IsDev: 'isDev',
  IsCI: 'isCI',
  AuthCookie: 'authCookie',
  Cookies: 'cookies',
  Jwt: 'jwt',
  LogSettings: 'logSettings',
  Postgres: 'postgres',
  Redis: 'redis',
  Services: 'services',
} as const;

export type ConfigKeyValues = (typeof ConfigKeys)[keyof typeof ConfigKeys];

export type Config = {
  [ConfigKeys.Port]: number;
  [ConfigKeys.IsDev]: boolean;
  [ConfigKeys.IsCI]: boolean;
  [ConfigKeys.AuthCookie]: AuthCookieConfig;
  [ConfigKeys.Cookies]: CookiesConfig;
  [ConfigKeys.Jwt]: JwtConfig;
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
} as const;

export type ServiceNameValues = (typeof ServiceNames)[keyof typeof ServiceNames];
