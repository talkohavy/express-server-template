import jwt from 'jsonwebtoken';
import { TokenGenerationService } from './token-generation.service';
import type { JwtConfig } from '@src/plugins/config-service';

describe('TokenGenerationService', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  let service: TokenGenerationService;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const jwtConfig: JwtConfig = {
      accessSecret: 'test-access-secret',
      accessTokenTtlSeconds: 900,
      issuer: 'test-issuer',
    };

    service = new TokenGenerationService(jwtConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createAccessToken', () => {
    it('should sign the payload with the configured issuer, audience and lifetime', async () => {
      const expectedResult = {
        id: 'user-123',
        role: 'user',
        sid: 'session-1',
        iss: 'test-issuer',
        aud: 'user-123',
        iat: now.getTime() / 1000,
        exp: now.getTime() / 1000 + 900,
      };

      const { accessToken } = await service.createAccessToken({ id: 'user-123', role: 'user', sid: 'session-1' });

      const actualResult = jwt.verify(accessToken, 'test-access-secret');
      expect(actualResult).toEqual(expectedResult);
    });

    it('should return when the access token expires, in milliseconds', async () => {
      const expectedResult = now.getTime() + 900 * 1000;

      const { expiresAt: actualResult } = await service.createAccessToken({ id: 'user-123' });

      expect(actualResult).toBe(expectedResult);
    });
  });

  describe('createRefreshToken', () => {
    it('should create a 32-byte base64url string', () => {
      const refreshToken = service.createRefreshToken();

      expect(refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    it('should not be a JWT', () => {
      const refreshToken = service.createRefreshToken();

      expect(jwt.decode(refreshToken)).toBeNull();
    });

    it('should create a different token on every call', () => {
      const firstToken = service.createRefreshToken();

      const secondToken = service.createRefreshToken();

      expect(secondToken).not.toBe(firstToken);
    });
  });
});
