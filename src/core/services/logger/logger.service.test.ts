import { Logger, LogLevel } from '@src/lib/logger';
import { LoggerService } from './logger.service';
import type { CallContextService } from '@src/core/services/call-context';

describe('LoggerService', () => {
  let consoleLogSpy: jest.SpyInstance;
  let loggerService: LoggerService;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const logger = new Logger({ settings: { logLevel: LogLevel.Debug, usePrettyPrint: false } });
    const callContextService = { getStore: jest.fn() } as unknown as CallContextService;

    loggerService = new LoggerService(logger, callContextService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function getPrintedLog() {
    const [printedLine] = consoleLogSpy.mock.calls[0];

    const printedLog = JSON.parse(printedLine);

    return printedLog;
  }

  describe('when the data holds an error', () => {
    const error = new TypeError("Cannot read properties of undefined (reading 'id')");

    it('should print the error with its stack', () => {
      const expectedResult = { name: error.name, message: error.message, stack: error.stack };

      loggerService.error('Failed to load the user', { userId: '7', error });

      const actualResult = getPrintedLog().error;
      expect(actualResult).toEqual(expectedResult);
    });

    it('should print the rest of the data', () => {
      const expectedResult = { userId: '7' };

      loggerService.error('Failed to load the user', { userId: '7', error });

      const actualResult = getPrintedLog().data;
      expect(actualResult).toEqual(expectedResult);
    });
  });

  describe('when the data holds something other than an Error under `error`', () => {
    it('should print it as part of the data', () => {
      const expectedResult = { error: 'timeout' };

      loggerService.warn('Failed to refresh the lease', { error: 'timeout' });

      const actualResult = getPrintedLog().data;
      expect(actualResult).toEqual(expectedResult);
    });
  });

  describe('when the data is not an object', () => {
    it('should print it as is', () => {
      loggerService.error('Book not found', 'book-7');

      const actualResult = getPrintedLog().data;
      expect(actualResult).toBe('book-7');
    });
  });
});
