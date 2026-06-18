import { ConfigService } from '@src/core/services/config';
import { configuration } from './logic/configuration';
import type { Application } from 'express';
import type { Config } from './logic/constants';

export function configServicePlugin(app: Application) {
  const configSettings: Config = configuration();
  const configService = new ConfigService(configSettings);

  app.configService = configService;
}
