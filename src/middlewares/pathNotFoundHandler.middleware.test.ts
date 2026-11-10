import express, { type Application } from 'express';
import request from 'supertest';
import { StatusCodes } from '@src/common/constants';
import { pathNotFoundHandler } from './pathNotFoundHandler.middleware';

describe('pathNotFoundHandler', () => {
  let app: Application;

  beforeEach(() => {
    app = express() as unknown as Application;

    pathNotFoundHandler(app);
  });

  it('should respond with 404', async () => {
    const response = await request(app).get('/api/missing');

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });

  it('should name the method and the path, without the query string', async () => {
    const expectedResult = { statusCode: StatusCodes.NOT_FOUND, message: 'Cannot POST /api/missing' };

    const response = await request(app).post('/api/missing?token=secret');

    const actualResult = response.body;
    expect(actualResult).toEqual(expectedResult);
  });
});
