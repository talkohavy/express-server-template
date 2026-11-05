import { generateKeyPairSync } from 'node:crypto';
import { isEs256Key } from './is-es256-key';

describe('isEs256Key', () => {
  it('should accept a P-256 key', () => {
    const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

    const actualResult = isEs256Key(publicKey);

    expect(actualResult).toBe(true);
  });

  it('should reject a key on another curve', () => {
    const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'secp384r1' });

    const actualResult = isEs256Key(publicKey);

    expect(actualResult).toBe(false);
  });

  it('should reject an RSA key', () => {
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

    const actualResult = isEs256Key(publicKey);

    expect(actualResult).toBe(false);
  });
});
