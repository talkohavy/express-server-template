import cookieParser from 'cookie-parser';
import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { SseAuthenticationMiddleware } from './sse-authentication.middleware';
import type { TokenVerificationService } from '../../authentication/services/token-verification';

const ACCESS_COOKIE_NAME = 'access_token';

describe('SseAuthenticationMiddleware', () => {
  let app: Application;
  let tokenVerificationService: { verifyToken: jest.Mock };

  beforeEach(() => {
    app = express() as unknown as Application;
    app.use(cookieParser());

    app.configService = {
      get: jest.fn().mockReturnValue({ accessCookie: { name: ACCESS_COOKIE_NAME } }),
    } as any;

    tokenVerificationService = { verifyToken: jest.fn() };

    const middleware = new SseAuthenticationMiddleware(
      app,
      tokenVerificationService as unknown as TokenVerificationService,
    );
    middleware.use();

    app.get(API_PATHS.sse, (req: Request, res: Response) => {
      res.json(req.user);
    });

    app.get('/api/other', (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
      res.status(error.statusCode).json({ message: error.message });
    });
  });

  it('should respond with 401 when the access token cookie is missing', async () => {
    const response = await request(app).get(API_PATHS.sse);

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it('should respond with 401 when the token fails verification', async () => {
    tokenVerificationService.verifyToken.mockRejectedValue(new Error('jwt expired'));

    const response = await request(app).get(API_PATHS.sse).set('Cookie', `${ACCESS_COOKIE_NAME}=expired-token`);

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it('should attach the user to the request when the token is valid', async () => {
    tokenVerificationService.verifyToken.mockResolvedValue({ id: '42', role: 'admin', iat: 1, exp: 2 });

    const expectedResult = { id: '42', role: 'admin', exp: 2, iat: 1 };

    const response = await request(app).get(API_PATHS.sse).set('Cookie', `${ACCESS_COOKIE_NAME}=valid-token`);
    const actualResult = response.body;

    expect(actualResult).toEqual(expectedResult);
  });

  it('should not affect routes outside the SSE path', async () => {
    const response = await request(app).get('/api/other');

    expect(response.status).toBe(StatusCodes.OK);
  });
});
