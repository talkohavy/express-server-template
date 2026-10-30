import { hashToken } from '../../logic/utils/hashToken';
import { SessionsService } from './sessions.service';
import type { RefreshTokensRepository } from '../../repositories/refresh-tokens';
import type { TokenGenerationService } from '../token-generation';

jest.mock('node:crypto', () => ({
  ...jest.requireActual('node:crypto'),
  randomUUID: jest.fn(() => 'new-session-id'),
}));

describe('SessionsService', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = new Date('2026-01-01T00:00:00.000Z').getTime();
  const refreshTokenConfig = { ttlMs: 7 * DAY_MS, sessionMaxAgeMs: 30 * DAY_MS };

  let refreshTokensRepository: { create: jest.Mock };
  let tokenGenerationService: { createAccessToken: jest.Mock; createRefreshToken: jest.Mock };
  let service: SessionsService;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);

    refreshTokensRepository = { create: jest.fn() };
    tokenGenerationService = {
      createAccessToken: jest.fn().mockResolvedValue({ accessToken: 'access-token', expiresAt: now + 900_000 }),
      createRefreshToken: jest.fn().mockReturnValue('raw-refresh-token'),
    };

    service = new SessionsService(
      refreshTokensRepository as unknown as RefreshTokensRepository,
      tokenGenerationService as unknown as TokenGenerationService,
      refreshTokenConfig,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createTokens', () => {
    describe('without a session (login)', () => {
      it('should store the hash of the refresh token in a new family, never the raw token', async () => {
        const expectedResult = {
          userId: 7,
          familyId: 'new-session-id',
          tokenHash: hashToken('raw-refresh-token'),
          expiresAt: new Date(now + 7 * DAY_MS),
          sessionExpiresAt: new Date(now + 30 * DAY_MS),
        };

        await service.createTokens({ userId: '7', role: 'user' });

        const actualResult = refreshTokensRepository.create.mock.calls[0][0];
        expect(actualResult).toEqual(expectedResult);
      });

      it('should sign the access token with the new session id as its sid', async () => {
        const expectedResult = { id: '7', role: 'user', sid: 'new-session-id' };

        await service.createTokens({ userId: '7', role: 'user' });

        const actualResult = tokenGenerationService.createAccessToken.mock.calls[0][0];
        expect(actualResult).toEqual(expectedResult);
      });

      it('should return both tokens with their expiry times', async () => {
        const expectedResult = {
          accessToken: 'access-token',
          accessTokenExpiresAt: now + 900_000,
          refreshToken: 'raw-refresh-token',
          refreshTokenExpiresAt: now + 7 * DAY_MS,
        };

        const actualResult = await service.createTokens({ userId: '7', role: 'user' });

        expect(actualResult).toEqual(expectedResult);
      });
    });

    describe('with a session (refresh)', () => {
      it('should keep the session id and its absolute end', async () => {
        const session = { id: 'existing-session-id', expiresAt: now + 20 * DAY_MS };
        const expectedResult = {
          familyId: 'existing-session-id',
          sessionExpiresAt: new Date(now + 20 * DAY_MS),
        };

        await service.createTokens({ userId: '7', role: 'user', session });

        const { familyId, sessionExpiresAt } = refreshTokensRepository.create.mock.calls[0][0];
        const actualResult = { familyId, sessionExpiresAt };
        expect(actualResult).toEqual(expectedResult);
      });

      it('should cap the refresh token expiry to the end of the session', async () => {
        const session = { id: 'existing-session-id', expiresAt: now + 2 * DAY_MS };
        const expectedResult = now + 2 * DAY_MS;

        const { refreshTokenExpiresAt: actualResult } = await service.createTokens({
          userId: '7',
          role: 'user',
          session,
        });

        expect(actualResult).toBe(expectedResult);
      });
    });
  });
});
