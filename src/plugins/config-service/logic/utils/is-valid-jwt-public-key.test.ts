import { generateKeyPairSync } from 'node:crypto';
import { isValidJwtPublicKey } from './is-valid-jwt-public-key';

function generateEcKeyPair(namedCurve: string) {
  const keyPair = generateKeyPairSync('ec', {
    namedCurve,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  return keyPair;
}

describe('isValidJwtPublicKey', () => {
  const { privateKey, publicKey } = generateEcKeyPair('prime256v1');

  it('should accept a P-256 public key', () => {
    const actualResult = isValidJwtPublicKey(publicKey);

    expect(actualResult).toBe(true);
  });

  it('should reject a private key', () => {
    const actualResult = isValidJwtPublicKey(privateKey);

    expect(actualResult).toBe(false);
  });

  it('should reject a public key on another curve', () => {
    const { publicKey: p384PublicKey } = generateEcKeyPair('secp384r1');

    const actualResult = isValidJwtPublicKey(p384PublicKey);

    expect(actualResult).toBe(false);
  });

  it('should reject a value that is not a PEM', () => {
    const actualResult = isValidJwtPublicKey('not-a-key');

    expect(actualResult).toBe(false);
  });
});
