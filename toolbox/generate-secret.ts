import { randomBytes } from 'node:crypto';

const DEFAULT_BYTE_LENGTH = 16;

type SecretEncoding = 'base64url' | 'base64' | 'hex';

export function generateSecret(byteLength = DEFAULT_BYTE_LENGTH, encoding: SecretEncoding = 'hex'): string {
  const secret = randomBytes(byteLength)
    .toString(encoding)
    .replace(/(.{8})(?!$)/g, '$1-');
  console.log('Generated secret:', secret);
  return secret;
}

generateSecret();
