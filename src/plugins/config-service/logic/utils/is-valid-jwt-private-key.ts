import { createPrivateKey } from 'node:crypto';
import { isEs256Key } from './is-es256-key';

export function isValidJwtPrivateKey(pem: string): boolean {
  try {
    const key = createPrivateKey(pem);
    const isValid = isEs256Key(key);

    return isValid;
  } catch {
    return false;
  }
}
