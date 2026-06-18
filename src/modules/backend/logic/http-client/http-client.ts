import { StatusCodeToError, HttpMethod, type StatusCodeValues } from '@src/common/constants';
import { InternalServerError } from '@src/core/errors';
import { ConfigKeys, type Config, type ServicesConfig } from '@src/plugins/config-service';
import type { ConfigService } from '@src/core/services/config';
import type { GetRequestProps, RequestProps, RequestWithBodyProps } from './http-client.interface';

export class HttpClient {
  constructor(private readonly configService: ConfigService) {}

  async get<T>(props: GetRequestProps): Promise<T> {
    const { serviceName, route, options } = props;

    return this.request<T>({ serviceName, method: HttpMethod.GET, route, options });
  }

  async post<T>(props: RequestWithBodyProps): Promise<T> {
    const { serviceName, route, body, options } = props;

    return this.request<T>({ serviceName, method: HttpMethod.POST, route, body, options });
  }

  async put<T>(props: RequestWithBodyProps): Promise<T> {
    const { serviceName, route, body, options } = props;

    return this.request<T>({ serviceName, method: HttpMethod.PUT, route, body, options });
  }

  async patch<T>(props: RequestWithBodyProps): Promise<T> {
    const { serviceName, route, body, options } = props;

    return this.request<T>({ serviceName, method: HttpMethod.PATCH, route, body, options });
  }

  async delete<T>(props: RequestWithBodyProps): Promise<T> {
    const { serviceName, route, body, options } = props;

    return this.request<T>({ serviceName, method: HttpMethod.DELETE, body, route, options });
  }

  private async request<T>(props: RequestProps): Promise<T> {
    const { serviceName, method, route, body, options } = props;

    const { headers: additionalHeaders, queryParams, silent } = options ?? {};

    try {
      const services = this.configService.get<ServicesConfig>(ConfigKeys.Services);
      const { baseUrl } = services[serviceName];

      const stringifiedBody = body ? JSON.stringify(body) : undefined;
      const headers = new Headers(additionalHeaders as any);

      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const queryString = queryParams ? new URLSearchParams(queryParams).toString() : '';
      const targetUrl = `${baseUrl}${route}${queryString ? `?${queryString}` : ''}`;

      // cURL command logging for debugging
      const curlCommand = `curl -X ${method} '${targetUrl}' -H 'Content-Type: application/json' -d '${stringifiedBody}'`;
      console.log(`cURL command: ${curlCommand}`);

      const response = await fetch(targetUrl, { method, body: stringifiedBody, headers });

      if (!response.ok) {
        const errorText = await response.text();
        const statusCode = response.status as StatusCodeValues;
        const ErrorToThrow = StatusCodeToError[statusCode] ?? InternalServerError;
        throw new ErrorToThrow(errorText);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (silent) return undefined as T;

      const { isDev } = this.configService.get<Config>();
      const errorMessage = isDev ? error.message : 'Request between micro-services failed...';

      throw new InternalServerError(errorMessage);
    }
  }
}
