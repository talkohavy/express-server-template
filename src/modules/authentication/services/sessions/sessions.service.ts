import { randomUUID } from 'node:crypto';
import { hashToken } from '../../logic/utils/hashToken';
import type { RefreshTokenConfig } from '@src/plugins/config-service';
import type { RefreshTokensRepository } from '../../repositories/refresh-tokens';
import type { TokenGenerationService } from '../token-generation';
import type { CreateTokensProps, CreateTokensResult } from './types';

export class SessionsService {
  constructor(
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly tokenGenerationService: TokenGenerationService,
    private readonly refreshTokenConfig: RefreshTokenConfig,
  ) {}

  /**
   * Issues an access token, plus a refresh token that is stored (hashed) in the DB.
   *
   * Without a `session`, starts a new one (login). With one, issues the next token of that session (refresh).
   */
  async createTokens(props: CreateTokensProps): Promise<CreateTokensResult> {
    const { userId, role, session } = props;
    const { ttlMs, sessionMaxAgeMs } = this.refreshTokenConfig;

    const now = Date.now();
    const sessionId = session?.id ?? randomUUID();
    const sessionExpiresAt = session?.expiresAt ?? now + sessionMaxAgeMs;
    const refreshTokenExpiresAt = Math.min(now + ttlMs, sessionExpiresAt);

    const refreshToken = this.tokenGenerationService.createRefreshToken();
    const tokenHash = hashToken(refreshToken);

    await this.refreshTokensRepository.create({
      userId: Number(userId),
      familyId: sessionId,
      tokenHash,
      expiresAt: new Date(refreshTokenExpiresAt),
      sessionExpiresAt: new Date(sessionExpiresAt),
    });

    const { accessToken, expiresAt: accessTokenExpiresAt } = await this.tokenGenerationService.createAccessToken({
      id: userId,
      role,
      sid: sessionId,
    });

    return { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt };
  }
}
