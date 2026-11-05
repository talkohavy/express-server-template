import { createPrivateKey, createPublicKey } from 'node:crypto';
import { isEs256Key } from './is-es256-key';

function isPrivateKeyPem(pem: string): boolean {
  try {
    createPrivateKey(pem);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rejects a private key too: `createPublicKey` accepts one (deriving its public half), which would put the private key
 * on every server that only verifies tokens.
 */
export function isValidJwtPublicKey(pem: string): boolean {
  if (isPrivateKeyPem(pem)) return false;

  try {
    const key = createPublicKey(pem);
    const isValid = isEs256Key(key);

    return isValid;
  } catch {
    return false;
  }
}
