import { generateKeyPairSync } from 'node:crypto';

/**
 * Prints a fresh ES256 key pair, as base64-encoded PEMs ready to paste into `.env`.
 */
function generateJwtKeys(): void {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  const encodedPrivateKey = Buffer.from(privateKey).toString('base64');
  const encodedPublicKey = Buffer.from(publicKey).toString('base64');

  console.log(`JWT_ACCESS_PRIVATE_KEY=${encodedPrivateKey}`);
  console.log(`JWT_ACCESS_PUBLIC_KEY=${encodedPublicKey}`);
}

generateJwtKeys();
