import { randomUUID } from 'node:crypto';
import { UnauthorizedError } from '@src/core/errors';
import { hashToken } from '../../logic/utils/hashToken';
import type { RefreshTokenConfig } from '@src/plugins/config-service';
import type { RefreshTokensRepository } from '../../repositories/refresh-tokens';
import type { TokenGenerationService } from '../token-generation';
import type { ConsumeRefreshTokenResult, CreateTokensProps, CreateTokensResult } from './types';

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

  /**
   * Uses up a refresh token: it can never be used again. Call `createTokens` with the returned session to rotate it.
   *
   * A token that was already used is a sign it was stolen (either the thief or the user is replaying it),
   * so the whole session is revoked, logging out both.
   *
   * @throws {UnauthorizedError} when the token is unknown, expired, or already used.
   */
  async consumeRefreshToken(refreshToken: string): Promise<ConsumeRefreshTokenResult> {
    const tokenHash = hashToken(refreshToken);

    const consumedToken = await this.refreshTokensRepository.consumeByHash(tokenHash);

    if (!consumedToken) {
      await this.revokeSessionIfReused(tokenHash);

      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const { user_id, family_id, session_expires_at } = consumedToken;

    const result: ConsumeRefreshTokenResult = {
      userId: user_id.toString(),
      session: {
        id: family_id,
        expiresAt: session_expires_at.getTime(),
      },
    };

    return result;
  }

  private async revokeSessionIfReused(tokenHash: string): Promise<void> {
    const knownToken = await this.refreshTokensRepository.getByHash(tokenHash);

    if (!knownToken?.revoked_at) return;

    await this.refreshTokensRepository.revokeFamily(knownToken.family_id);
  }
}
