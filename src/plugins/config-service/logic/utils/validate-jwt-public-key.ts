import { decodePemKey } from './decode-pem-key';
import { isValidJwtPublicKey } from './is-valid-jwt-public-key';
import type { CustomHelpers } from 'joi';

export function validateJwtPublicKey(value: string, helpers: CustomHelpers) {
  const pem = decodePemKey(value);
  const isValid = isValidJwtPublicKey(pem);

  if (!isValid) return helpers.message({ custom: '{{#label}} must be a base64-encoded PEM of an ES256 public key' });

  return pem;
}
