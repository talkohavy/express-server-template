import { Context } from './logic/constants';
import type { CallContextService } from '@src/core/services/call-context';
import type { ILogger } from '@src/lib/logger';

export class LoggerService {
  public constructor(
    private readonly logger: ILogger,
    private readonly callContextService: CallContextService,
  ) {}

  debug(message: string, data?: any) {
    const logMetadata = this.addLogContext(data);

    this.logger.debug(message, logMetadata);
  }

  log(message: string, data?: any) {
    const logMetadata = this.addLogContext(data);

    this.logger.log(message, logMetadata);
  }

  info(message: string, data?: any) {
    const logMetadata = this.addLogContext(data);

    this.logger.info(message, logMetadata);
  }

  warn(message: string, data?: any) {
    const logMetadata = this.addLogContext(data);

    this.logger.warn(message, logMetadata);
  }

  error(message: string, data?: any) {
    // No need to call shouldLog. ALWAYS print if error and above!
    const logMetadata = this.addLogContext(data);

    this.logger.error(message, logMetadata);
  }

  fatal(message: string, data?: any) {
    // No need to call shouldLog. ALWAYS print if error and above!
    const logMetadata = this.addLogContext(data);

    this.logger.fatal(message, logMetadata);
  }

  private addLogContext(data: Record<string, any> = {}) {
    const logContextMetadata = this.getLogMetadataFromContext(this.callContextService.getStore());

    const enrichedLogMetadata = { data, ...logContextMetadata };

    return enrichedLogMetadata;
  }

  private getLogMetadataFromContext(callContextStore: Map<string, string | object | boolean>) {
    if (!callContextStore) return {};

    return {
      [Context.RequestId]: callContextStore.get(Context.RequestId) as string,
      [Context.Method]: callContextStore.get(Context.Method) as string,
      [Context.Query]: callContextStore.get(Context.Query) as string,
      [Context.OriginalUrl]: callContextStore.get(Context.OriginalUrl) as string,
      [Context.Url]: callContextStore.get(Context.Url) as string,
      [Context.Path]: callContextStore.get(Context.Path) as string,
    };
  }
}
