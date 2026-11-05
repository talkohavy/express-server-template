import { generateKeyPairSync } from 'node:crypto';
import { isValidJwtPrivateKey } from './is-valid-jwt-private-key';

function generateEcKeyPair(namedCurve: string) {
  const keyPair = generateKeyPairSync('ec', {
    namedCurve,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  return keyPair;
}

describe('isValidJwtPrivateKey', () => {
  const { privateKey, publicKey } = generateEcKeyPair('prime256v1');

  it('should accept a P-256 private key', () => {
    const actualResult = isValidJwtPrivateKey(privateKey);

    expect(actualResult).toBe(true);
  });

  it('should reject a public key', () => {
    const actualResult = isValidJwtPrivateKey(publicKey);

    expect(actualResult).toBe(false);
  });

  it('should reject a private key on another curve', () => {
    const { privateKey: p384PrivateKey } = generateEcKeyPair('secp384r1');

    const actualResult = isValidJwtPrivateKey(p384PrivateKey);

    expect(actualResult).toBe(false);
  });

  it('should reject an RSA private key', () => {
    const { privateKey: rsaPrivateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });

    const actualResult = isValidJwtPrivateKey(rsaPrivateKey);

    expect(actualResult).toBe(false);
  });

  it('should reject a value that is not a PEM', () => {
    const actualResult = isValidJwtPrivateKey('not-a-key');

    expect(actualResult).toBe(false);
  });
});
