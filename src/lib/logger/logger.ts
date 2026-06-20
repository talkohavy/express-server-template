import { colorMyJson, COLORS } from 'color-my-json';
import { LogLevel, LogLevelToNumber, type LogLevelValues } from './logic/constants';
import { createEnumerableError } from './logic/utils/createEnumerableError';
import type { ILogger, LoggerConstructorProps } from './logger.interface';
import type { LoggerSettings } from './types';

export class Logger implements ILogger {
  private readonly settings: LoggerSettings;
  private readonly fixedKeys: Record<string, any>;
  private readonly globalLogLevelValue: number;

  public constructor(props: LoggerConstructorProps) {
    const { settings, fixedKeys = {} } = props;

    const reservedKeys = ['_time', 'message', 'level', 'data', 'error'];
    for (const key of reservedKeys) {
      if (key in fixedKeys) {
        throw new Error(`The key "${key}" is reserved and CANNOT be used!`);
      }
    }

    this.globalLogLevelValue = LogLevelToNumber[settings?.logLevel ?? LogLevel.Info];

    this.settings = settings;
    this.fixedKeys = fixedKeys;
  }

  debug(message: string, data?: any) {
    if (!this.shouldLog(LogLevel.Debug)) return;

    const logMetadata = this.enrichLogMetadata(message, data, LogLevel.Debug);

    this.logMe(logMetadata, LogLevel.Debug);
  }

  log(message: string, data?: any) {
    if (!this.shouldLog(LogLevel.Info)) return;

    const logMetadata = this.enrichLogMetadata(message, data, LogLevel.Info);

    this.logMe(logMetadata, LogLevel.Info);
  }

  info(message: string, data?: any) {
    if (!this.shouldLog(LogLevel.Info)) return;

    const logMetadata = this.enrichLogMetadata(message, data, LogLevel.Info);

    this.logMe(logMetadata, LogLevel.Info);
  }

  warn(message: string, data?: any) {
    if (!this.shouldLog(LogLevel.Warn)) return;

    const logMetadata = this.enrichLogMetadata(message, data, LogLevel.Warn);

    this.logMe(logMetadata, LogLevel.Warn);
  }

  error(message: string, data?: any) {
    // No need to call shouldLog. ALWAYS print if error and above!

    const logMetadata = this.enrichLogMetadata(message, data, LogLevel.Error);

    this.logMe(logMetadata, LogLevel.Error);
  }

  fatal(message: string, data?: any) {
    // No need to call shouldLog. ALWAYS print if error and above!

    const logMetadata = this.enrichLogMetadata(message, data, LogLevel.Fatal);

    this.logMe(logMetadata, LogLevel.Fatal);
  }

  private logMe(logMetadata: string, level: LogLevelValues): void {
    if (this.settings.useColoredOutput) {
      this.logFormattedOutput(logMetadata, level);
    } else {
      this.logRawOutput(logMetadata);
    }
  }

  private logFormattedOutput(logMetadata: string, level: LogLevelValues): void {
    console.log('');

    const isErrorLevel = level === LogLevel.Error || level === LogLevel.Fatal;

    if (isErrorLevel) {
      console.log(`${COLORS.red}${logMetadata}${COLORS.stop}`);
    } else {
      console.log(colorMyJson(logMetadata));
    }
  }

  private logRawOutput(logMetadata: string): void {
    console.log(logMetadata);
  }

  private enrichLogMetadata(message: string, extraData: Record<string, any>, level: LogLevelValues) {
    const error = extraData?.error && createEnumerableError(extraData.error);

    const enrichedLogMetadata = {
      _time: new Date().toISOString(),
      message,
      level,
      ...extraData, // must come before error key!
      error,
      ...this.fixedKeys,
    };

    return JSON.stringify(enrichedLogMetadata, null, 2);
  }

  private shouldLog(logLevel: LogLevelValues) {
    const currentLogLevelValue = LogLevelToNumber[logLevel];

    return currentLogLevelValue <= this.globalLogLevelValue;
  }
}
