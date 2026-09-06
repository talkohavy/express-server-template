import type { LogLevelValues } from './logic/constants';

export type LoggerSettings = {
  /**
   * The log level to use for the logger.
   * @default 'info'
   */
  logLevel?: LogLevelValues;
  /**
   * Whether to use colored pretty print output in the logs.
   *
   * Useful for development environments.
   * @default false
   */
  usePrettyPrint?: boolean;
};
