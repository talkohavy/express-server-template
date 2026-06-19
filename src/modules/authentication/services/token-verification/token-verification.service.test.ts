import jwt from 'jsonwebtoken';
import { TokenVerificationService } from './token-verification.service';

describe('TokenVerificationService', () => {
  let service: TokenVerificationService;
  const mockAccessSecret = 'test-access-secret';
  const mockIssuer = 'test-issuer';

  beforeEach(() => {
    const jwtConfig = {
      accessSecret: mockAccessSecret,
      refreshSecret: 'test-refresh-secret',
      accessExpireTime: '15m',
      refreshExpireTime: '7d',
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

    it('should reject an invalid token', async () => {
      const invalidToken = 'invalid.token.string';

      await expect(service.verifyToken(invalidToken)).rejects.toThrow();
    });

    it('should reject a token with wrong issuer', async () => {
      const payload = { id: 'user-123' };
      const token = jwt.sign(payload, mockAccessSecret, {
        issuer: 'wrong-issuer',
        expiresIn: '15m',
      });

      await expect(service.verifyToken(token)).rejects.toThrow();
    });

    it('should reject an expired token', async () => {
      const payload = { id: 'user-123' };
      const token = jwt.sign(payload, mockAccessSecret, {
        issuer: mockIssuer,
        expiresIn: '0s',
      });

      // Wait a bit to ensure token expires
      await new Promise((resolve) => setTimeout(resolve, 100));

      await expect(service.verifyToken(token)).rejects.toThrow();
    });
  });
});
