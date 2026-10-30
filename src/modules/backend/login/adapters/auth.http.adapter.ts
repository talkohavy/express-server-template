import { API_PATHS } from '@src/common/constants';
import { ServiceNames } from '@src/plugins/config-service';
import type { HttpClient } from '../../logic/http-client';
import type {
  ConsumedRefreshToken,
  CreateTokensProps,
  IAuthAdapter,
  RevokedSession,
  Tokens,
  DecodedToken,
} from './auth.adapter.interface';

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

  async createTokens(props: CreateTokensProps): Promise<Tokens> {
    const { userId, role, session } = props;

    const response = await this.httpClient.post<Tokens>({
      serviceName: ServiceNames.Auth,
      route: API_PATHS.createTokens,
      body: { userId, role, session },
    });

    return response;
  }

  async consumeRefreshToken(refreshToken: string): Promise<ConsumedRefreshToken> {
    const response = await this.httpClient.post<ConsumedRefreshToken>({
      serviceName: ServiceNames.Auth,
      route: API_PATHS.consumeRefreshToken,
      body: { refreshToken },
    });

    return response;
  }

  async revokeSession(refreshToken: string): Promise<RevokedSession | null> {
    const response = await this.httpClient.post<RevokedSession | null>({
      serviceName: ServiceNames.Auth,
      route: API_PATHS.revokeSession,
      body: { refreshToken },
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
