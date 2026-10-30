import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '@src/core/errors';
import { TokenVerificationService } from './token-verification.service';

describe('TokenVerificationService', () => {
  let service: TokenVerificationService;
  const mockAccessSecret = 'test-access-secret';
  const mockIssuer = 'test-issuer';

  beforeEach(() => {
    const jwtConfig = {
      accessSecret: mockAccessSecret,
      accessTokenTtlSeconds: 900,
      issuer: mockIssuer,
    };

    service = new TokenVerificationService(jwtConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', async () => {
      const payload = { id: 'user-123', iat: Math.floor(Date.now() / 1000) };
      const token = jwt.sign(payload, mockAccessSecret, {
        issuer: mockIssuer,
        expiresIn: '15m',
      });

      const result = await service.verifyToken(token);

      expect(result).toMatchObject({ id: 'user-123' });
      expect(result.iat).toBeDefined();
    });

    it('should reject an invalid token with an UnauthorizedError', async () => {
      const invalidToken = 'invalid.token.string';

      await expect(service.verifyToken(invalidToken)).rejects.toThrow(UnauthorizedError);
    });

    it('should reject a missing token with an UnauthorizedError', async () => {
      await expect(service.verifyToken(undefined as unknown as string)).rejects.toThrow(UnauthorizedError);
    });

    it('should reject a token with wrong issuer with an UnauthorizedError', async () => {
      const payload = { id: 'user-123' };
      const token = jwt.sign(payload, mockAccessSecret, {
        issuer: 'wrong-issuer',
        expiresIn: '15m',
      });

      await expect(service.verifyToken(token)).rejects.toThrow(UnauthorizedError);
    });

    it('should reject a token signed with a different secret with an UnauthorizedError', async () => {
      const payload = { id: 'user-123' };
      const token = jwt.sign(payload, 'some-other-secret', {
        issuer: mockIssuer,
        expiresIn: '15m',
      });

      await expect(service.verifyToken(token)).rejects.toThrow(UnauthorizedError);
    });

    it('should reject an expired token with an UnauthorizedError', async () => {
      const payload = { id: 'user-123', exp: Math.floor(Date.now() / 1000) - 60 };
      const token = jwt.sign(payload, mockAccessSecret, { issuer: mockIssuer });

      await expect(service.verifyToken(token)).rejects.toThrow(UnauthorizedError);
    });

    it('should respond with a 401 status code when rejecting', async () => {
      const invalidToken = 'invalid.token.string';

      const actualResult = await service.verifyToken(invalidToken).catch((error) => error.statusCode);

      expect(actualResult).toBe(401);
    });
  });
});
