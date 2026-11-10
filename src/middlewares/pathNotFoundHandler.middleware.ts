import { Headers, StatusCodes } from '@src/common/constants';
import type { Application, Request, Response } from 'express';

export function pathNotFoundHandler(app: Application) {
  app.use(pathNotFoundMiddleware);
}

function pathNotFoundMiddleware(req: Request, res: Response) {
  const data = {
    statusCode: StatusCodes.NOT_FOUND,
    message: `Cannot ${req.method} ${req.path}`,
    requestId: req.headers[Headers.RequestId],
  };

  res.status(data.statusCode).json(data);
}
