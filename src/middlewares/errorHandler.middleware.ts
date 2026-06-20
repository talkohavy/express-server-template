import { COLORS } from 'color-my-json';
import { StatusCodes } from '@src/common/constants';
import type { Application, Request, Response } from 'express';

export function errorHandler(app: Application) {
  app.use(globalErrorMiddleware);
}

function globalErrorMiddleware(error: any, req: Request, res: Response, _next: any) {
  const logger = (req.app as Application).logger;

  console.error(`${COLORS.red}▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼${COLORS.stop}`);
  logger.error(error);
  console.error(`${COLORS.red}▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲${COLORS.stop}`);

  // if (condition) logger.error(error.message); // <--- store the error if <condition>...

  const data = {
    statusCode: error.statusCode ?? StatusCodes.INTERNAL_ERROR,
    message: error.message,
  };

  res.status(data.statusCode).json(data);
}
