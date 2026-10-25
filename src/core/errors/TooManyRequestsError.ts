import { StatusCodes } from '@src/common/constants';
import { HttpException } from './HttpException';

type TooManyRequestsErrorOptions = {
  /**
   * @default false
   */
  shouldReport?: boolean;
};

export class TooManyRequestsError extends HttpException {
  constructor(message?: string, options?: TooManyRequestsErrorOptions) {
    const { shouldReport } = options ?? {};

    super({
      name: TooManyRequestsError.name,
      message: message ?? 'Too Many Requests',
      statusCode: StatusCodes.TOO_MANY_REQUESTS,
      shouldReport,
    });
  }
}
