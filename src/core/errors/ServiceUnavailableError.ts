import { StatusCodes } from '@src/common/constants';
import { HttpException } from './HttpException';

type ServiceUnavailableErrorOptions = {
  /**
   * @default false
   */
  shouldReport?: boolean;
};

export class ServiceUnavailableError extends HttpException {
  constructor(message?: string, options?: ServiceUnavailableErrorOptions) {
    const { shouldReport } = options ?? {};

    super({
      name: ServiceUnavailableError.name,
      message: message ?? 'Service Unavailable',
      statusCode: StatusCodes.SERVICE_UNAVAILABLE,
      shouldReport,
    });
  }
}
