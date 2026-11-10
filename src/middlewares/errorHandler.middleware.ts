import { Headers, StatusCodes } from '@src/common/constants';
import { HttpException } from '@src/core/errors';
import { ConfigKeys } from '@src/plugins/config-service';
import type { Application, NextFunction, Request, Response } from 'express';
import type { ConfigService } from '@src/core/services/config';
import type { LoggerService } from '@src/core/services/logger';

export function errorHandler(app: Application) {
  const middleware = globalErrorMiddleware(app);

  app.use(middleware);
}

function globalErrorMiddleware(app: Application) {
  const { logger, configService } = app;

  return function handleError(error: any, req: Request, res: Response, next: NextFunction) {
    const statusCode = getStatusCode(error);

    logError({ logger, error, statusCode, req });

    // Too late to send an error response. Express's default handler closes the connection instead.
    if (res.headersSent) return void next(error);

    const message = getClientMessage({ error, statusCode, configService });

    const data = { statusCode, message, requestId: req.headers[Headers.RequestId] };

    res.status(statusCode).json(data);
  };
}

function getStatusCode(error: any): number {
  const statusCode = error.statusCode ?? error.status;

  const isErrorStatusCode = Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599;

  return isErrorStatusCode ? statusCode : StatusCodes.INTERNAL_ERROR;
}

type LogErrorProps = {
  logger: LoggerService;
  error: any;
  statusCode: number;
  req: Request;
};

function logError(props: LogErrorProps) {
  const { logger, error, statusCode, req } = props;

  const requestDetails = { statusCode, method: req.method, path: req.path, requestId: req.headers[Headers.RequestId] };

  const isServerError = statusCode >= StatusCodes.INTERNAL_ERROR;

  if (isServerError || error.shouldReport) {
    return void logger.error(error.message, { ...requestDetails, error });
  }

  logger.info(error.message, requestDetails);
}

type GetClientMessageProps = {
  error: any;
  statusCode: number;
  configService: ConfigService;
};

function getClientMessage(props: GetClientMessageProps): string {
  const { error, statusCode, configService } = props;

  const isMessageForClient = error instanceof HttpException || statusCode < StatusCodes.INTERNAL_ERROR;

  if (isMessageForClient) return error.message;

  const shouldExposeInternalErrors = configService.get<boolean>(ConfigKeys.ExposeInternalErrors);

  return shouldExposeInternalErrors ? error.message : 'Internal Server Error';
}
