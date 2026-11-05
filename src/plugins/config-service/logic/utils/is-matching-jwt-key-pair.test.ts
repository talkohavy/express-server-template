import { generateKeyPairSync } from 'node:crypto';
import { isMatchingJwtKeyPair } from './is-matching-jwt-key-pair';

function generateEs256KeyPair() {
  const keyPair = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  return keyPair;
}

describe('isMatchingJwtKeyPair', () => {
  const { privateKey, publicKey } = generateEs256KeyPair();

  it('should accept the two halves of the same key pair', () => {
    const actualResult = isMatchingJwtKeyPair({ privateKeyPem: privateKey, publicKeyPem: publicKey });

    expect(actualResult).toBe(true);
  });

  it('should reject a public key of another key pair', () => {
    const { publicKey: otherPublicKey } = generateEs256KeyPair();

    const actualResult = isMatchingJwtKeyPair({ privateKeyPem: privateKey, publicKeyPem: otherPublicKey });

    expect(actualResult).toBe(false);
  });
});
