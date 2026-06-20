import { LoggerService } from '@src/core/services/logger';
import { Logger, type LoggerSettings } from '@src/lib/logger';
import { ConfigKeys } from './config-service';
import type { Application } from 'express';
import type { CallContextService } from '@src/core/services/call-context';
import type { LoggerServiceSettings } from './config-service/types';

/**
 * @dependencies
 * - config-service plugin
 * - call-context plugin
 */
export function loggerPlugin(app: Application) {
  const { configService, callContextService } = app;

  const logSettings = configService.get(ConfigKeys.LogSettings);

  const loggerService = initLoggerService(logSettings, callContextService);

  app.logger = loggerService;
}

function initLoggerService(logSettings: LoggerServiceSettings, callContextService: CallContextService): LoggerService {
  const settings: LoggerSettings = {
    logLevel: logSettings.logLevel,
    useColoredOutput: logSettings.useColoredOutput,
  };

  const fixedKeys = {
    serviceName: logSettings.serviceName,
    environment: logSettings.logEnvironment,
  };

  const logger = new Logger({ settings, fixedKeys });

  const loggerService = new LoggerService(logger, callContextService);

  return loggerService;
}
