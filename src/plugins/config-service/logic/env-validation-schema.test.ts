import { generateKeyPairSync } from 'node:crypto';
import { envSchema } from './env-validation-schema';

function generateEncodedEs256KeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  const encodedKeyPair = {
    privateKey,
    publicKey,
    encodedPrivateKey: Buffer.from(privateKey).toString('base64'),
    encodedPublicKey: Buffer.from(publicKey).toString('base64'),
  };

  return encodedKeyPair;
}

describe('envSchema', () => {
  const { privateKey, publicKey, encodedPrivateKey, encodedPublicKey } = generateEncodedEs256KeyPair();
  const baseEnv = {
    POSTGRES_CONNECTION_STRING: 'postgresql://localhost:5432/db',
    REDIS_CONNECTION_STRING: 'redis://localhost:6379',
    MICRO_SERVICES_PROTOCOL: 'direct',
  };

  describe('JWT keys', () => {
    it('should decode base64-encoded keys into PEMs', () => {
      const expectedResult = { JWT_ACCESS_PRIVATE_KEY: privateKey, JWT_ACCESS_PUBLIC_KEY: publicKey };

      const { value } = envSchema.validate({
        ...baseEnv,
        JWT_ACCESS_PRIVATE_KEY: encodedPrivateKey,
        JWT_ACCESS_PUBLIC_KEY: encodedPublicKey,
      });

      const actualResult = {
        JWT_ACCESS_PRIVATE_KEY: value.JWT_ACCESS_PRIVATE_KEY,
        JWT_ACCESS_PUBLIC_KEY: value.JWT_ACCESS_PUBLIC_KEY,
      };
      expect(actualResult).toEqual(expectedResult);
    });

    it('should require both keys', () => {
      const expectedResult = ['JWT_ACCESS_PRIVATE_KEY', 'JWT_ACCESS_PUBLIC_KEY'];

      const { error } = envSchema.validate(baseEnv, { abortEarly: false });

      const actualResult = error?.details.map((detail) => detail.context?.key);
      expect(actualResult).toEqual(expectedResult);
    });

    it('should reject a private key passed as the public key', () => {
      const { error } = envSchema.validate({
        ...baseEnv,
        JWT_ACCESS_PRIVATE_KEY: encodedPrivateKey,
        JWT_ACCESS_PUBLIC_KEY: encodedPrivateKey,
      });

      expect(error?.message).toBe('"JWT_ACCESS_PUBLIC_KEY" must be a base64-encoded PEM of an ES256 public key');
    });

    it('should reject keys that are not a matching pair', () => {
      const { encodedPublicKey: otherEncodedPublicKey } = generateEncodedEs256KeyPair();

      const { error } = envSchema.validate({
        ...baseEnv,
        JWT_ACCESS_PRIVATE_KEY: encodedPrivateKey,
        JWT_ACCESS_PUBLIC_KEY: otherEncodedPublicKey,
      });

      expect(error?.message).toBe('"JWT_ACCESS_PUBLIC_KEY" is not the public half of "JWT_ACCESS_PRIVATE_KEY"');
    });
  });
});
