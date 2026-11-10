import express, { type Application, type Request, type Response } from 'express';
import request from 'supertest';
import { Headers, StatusCodes } from '@src/common/constants';
import { ForbiddenError, NotFoundError, ServiceUnavailableError } from '@src/core/errors';
import { ConfigKeys } from '@src/plugins/config-service';
import { errorHandler } from './errorHandler.middleware';

describe('errorHandler', () => {
  let app: Application;
  let logger: { info: jest.Mock; error: jest.Mock };
  let config: Record<string, unknown>;
  let errorToThrow: unknown;

  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn() };
    config = { [ConfigKeys.ExposeInternalErrors]: false };

    app = express() as unknown as Application;
    app.logger = logger as any;
    app.configService = { get: jest.fn((key: string) => config[key]) } as any;

    app.get('/fail', () => {
      throw errorToThrow;
    });

    app.post('/json', express.json(), (_req: Request, res: Response) => {
      res.json({});
    });

    errorHandler(app);
  });

  describe('when an HttpException with a 4xx status is thrown', () => {
    beforeEach(() => {
      errorToThrow = new NotFoundError('User 7 not found');
    });

    it('should respond with its status code and message', async () => {
      const expectedResult = { statusCode: StatusCodes.NOT_FOUND, message: 'User 7 not found' };

      const response = await request(app).get('/fail');

      const actualResult = response.body;
      expect(actualResult).toEqual(expectedResult);
    });

    it('should log it at info level, without the error itself', async () => {
      const expectedResult = ['User 7 not found', { statusCode: StatusCodes.NOT_FOUND, method: 'GET', path: '/fail' }];

      await request(app).get('/fail');

      const actualResult = logger.info.mock.calls[0];
      expect(actualResult).toEqual(expectedResult);
    });

    it('should not log it as an error', async () => {
      await request(app).get('/fail');

      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('when an HttpException with a 4xx status and shouldReport is thrown', () => {
    it('should log it as an error', async () => {
      const error = new ForbiddenError('Access denied', { shouldReport: true });
      errorToThrow = error;
      const expectedResult = [
        'Access denied',
        { statusCode: StatusCodes.FORBIDDEN, method: 'GET', path: '/fail', error },
      ];

      await request(app).get('/fail');

      const actualResult = logger.error.mock.calls[0];
      expect(actualResult).toEqual(expectedResult);
    });
  });

  describe('when an HttpException with a 5xx status is thrown', () => {
    it('should respond with its message', async () => {
      errorToThrow = new ServiceUnavailableError('Server is shutting down');
      const expectedResult = { statusCode: StatusCodes.SERVICE_UNAVAILABLE, message: 'Server is shutting down' };

      const response = await request(app).get('/fail');

      const actualResult = response.body;
      expect(actualResult).toEqual(expectedResult);
    });
  });

  describe('when an unexpected error is thrown', () => {
    const error = new TypeError("Cannot read properties of undefined (reading 'id')");

    beforeEach(() => {
      errorToThrow = error;
    });

    it('should respond with 500 and a generic message', async () => {
      const expectedResult = { statusCode: StatusCodes.INTERNAL_ERROR, message: 'Internal Server Error' };

      const response = await request(app).get('/fail');

      const actualResult = response.body;
      expect(actualResult).toEqual(expectedResult);
    });

    it('should log it as an error, with the error itself', async () => {
      const expectedResult = [
        error.message,
        { statusCode: StatusCodes.INTERNAL_ERROR, method: 'GET', path: '/fail', error },
      ];

      await request(app).get('/fail');

      const actualResult = logger.error.mock.calls[0];
      expect(actualResult).toEqual(expectedResult);
    });

    it('should respond with its message when internal errors are exposed', async () => {
      config[ConfigKeys.ExposeInternalErrors] = true;

      const response = await request(app).get('/fail');

      const actualResult = response.body.message;
      expect(actualResult).toBe(error.message);
    });
  });

  describe('when the request body is not valid JSON', () => {
    it('should respond with 400', async () => {
      const response = await request(app).post('/json').set('Content-Type', 'application/json').send('{"broken"');

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe('when an error carries a status code that is not an error status code', () => {
    it.each([200, 302, 1000, '404'])('should respond with 500 for %p', async (statusCode) => {
      errorToThrow = Object.assign(new Error('Odd error'), { statusCode });

      const response = await request(app).get('/fail');

      expect(response.status).toBe(StatusCodes.INTERNAL_ERROR);
    });
  });

  describe('when the request has a request id', () => {
    it('should include it in the response', async () => {
      errorToThrow = new NotFoundError();

      const response = await request(app).get('/fail').set(Headers.RequestId, 'request-1');

      const actualResult = response.body.requestId;
      expect(actualResult).toBe('request-1');
    });
  });

  describe('when the response has already started', () => {
    it('should pass the error on to Express, which closes the connection', () => {
      const error = new Error('Stream failed');
      const next = jest.fn();
      const req = { method: 'GET', path: '/stream', headers: {} };
      const res = { headersSent: true };
      const fakeApp = { logger, configService: app.configService, use: jest.fn() };
      errorHandler(fakeApp as unknown as Application);
      const [middleware] = fakeApp.use.mock.calls[0];

      middleware(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
