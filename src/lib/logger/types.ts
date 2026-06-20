import type { LogLevelValues } from './logic/constants';

export type LoggerSettings = {
  /**
   * The log level to use for the logger.
   * @default 'info'
   */
  logLevel?: LogLevelValues;
  /**
   * Whether to use colored output in the logs.
   * @default false
   */
  useColoredOutput?: boolean;
};
