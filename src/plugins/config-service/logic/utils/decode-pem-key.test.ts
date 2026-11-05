import { generateKeyPairSync } from 'node:crypto';
import { decodePemKey } from './decode-pem-key';

describe('decodePemKey', () => {
  const { publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  it('should decode a base64-encoded PEM', () => {
    const encodedKey = Buffer.from(publicKey).toString('base64');

    const actualResult = decodePemKey(encodedKey);

    expect(actualResult).toBe(publicKey);
  });

  it('should return a raw PEM as is', () => {
    const actualResult = decodePemKey(publicKey);

    expect(actualResult).toBe(publicKey);
  });
});
