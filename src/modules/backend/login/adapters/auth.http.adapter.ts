import { API_PATHS } from '@src/common/constants';
import { ServiceNames } from '@src/plugins/config-service';
import type { HttpClient } from '../../logic/http-client';
import type { IAuthAdapter, Tokens, DecodedToken } from './auth.adapter.interface';

export class AuthHttpAdapter implements IAuthAdapter {
  constructor(private readonly httpClient: HttpClient) {}

  async generateHashedPassword(rawPassword: string, salt: string): Promise<string> {
    const response = await this.httpClient.post<string>({
      serviceName: ServiceNames.Auth,
      route: API_PATHS.auth,
      body: { rawPassword, salt },
    });

    return response;
  }

  async getIsPasswordValid(hashedPassword: string, password: string): Promise<boolean> {
    const response = await this.httpClient.post<boolean>({
      serviceName: ServiceNames.Auth,
      route: API_PATHS.isPasswordValid,
      body: { hashedPassword, password },
    });

    return response;
  }

  async createTokens(userId: string, role: string): Promise<Tokens> {
    const response = await this.httpClient.post<Tokens>({
      serviceName: ServiceNames.Auth,
      route: API_PATHS.createTokens,
      body: { userId, role },
    });

    return response;
  }

  async verifyToken(token: string): Promise<DecodedToken> {
    const response = await this.httpClient.post<DecodedToken>({
      serviceName: ServiceNames.Auth,
      route: API_PATHS.verifyToken,
      body: { token },
    });

    return response;
  }
}
