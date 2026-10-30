import { StatusCodes } from '@src/common/constants';
import { InternalServerError, UnauthorizedError } from '@src/core/errors';
import { ConfigKeys, ServiceNames } from '@src/plugins/config-service';
import { HttpClient } from './http-client';
import type { ConfigService } from '@src/core/services/config';

describe('HttpClient', () => {
  let fetchMock: jest.SpyInstance;
  let httpClient: HttpClient;

  const config: Record<string, unknown> = {
    [ConfigKeys.Services]: { [ServiceNames.Auth]: { baseUrl: 'http://auth.internal' } },
    [ConfigKeys.ExposeInternalErrors]: false,
  };

  function mockResponse(status: number): void {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'downstream message' }), { status }));
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    fetchMock = jest.spyOn(global, 'fetch');

    const configService = { get: jest.fn((key: string) => config[key]) };
    httpClient = new HttpClient(configService as unknown as ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when the other service answers with a 4xx', () => {
    it('should keep its status', async () => {
      mockResponse(StatusCodes.UNAUTHORIZED);

      const actualResult = httpClient.post({ serviceName: ServiceNames.Auth, route: '/api/route', body: {} });

      await expect(actualResult).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('when the other service answers with a 5xx', () => {
    it('should hide its message', async () => {
      mockResponse(StatusCodes.INTERNAL_ERROR);

      const actualResult = httpClient.post({ serviceName: ServiceNames.Auth, route: '/api/route', body: {} });

      await expect(actualResult).rejects.toThrow(new InternalServerError('Request between micro-services failed...'));
    });
  });

  describe('when the other service is unreachable', () => {
    it('should reject with InternalServerError', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      const actualResult = httpClient.post({ serviceName: ServiceNames.Auth, route: '/api/route', body: {} });

      await expect(actualResult).rejects.toThrow(InternalServerError);
    });
  });
});
