import { decodePemKey } from './decode-pem-key';
import { isValidJwtPrivateKey } from './is-valid-jwt-private-key';
import type { CustomHelpers } from 'joi';

export function validateJwtPrivateKey(value: string, helpers: CustomHelpers) {
  const pem = decodePemKey(value);
  const isValid = isValidJwtPrivateKey(pem);

  if (!isValid) return helpers.message({ custom: '{{#label}} must be a base64-encoded PEM of an ES256 private key' });

  return pem;
}
