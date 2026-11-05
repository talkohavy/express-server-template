import { isMatchingJwtKeyPair } from './is-matching-jwt-key-pair';
import type { CustomHelpers } from 'joi';
import type { ValidEnv } from '../../types';

export function validateJwtKeyPair(env: ValidEnv, helpers: CustomHelpers) {
  const isMatching = isMatchingJwtKeyPair({
    privateKeyPem: env.JWT_ACCESS_PRIVATE_KEY,
    publicKeyPem: env.JWT_ACCESS_PUBLIC_KEY,
  });

  if (!isMatching) {
    return helpers.message({ custom: '"JWT_ACCESS_PUBLIC_KEY" is not the public half of "JWT_ACCESS_PRIVATE_KEY"' });
  }

  return env;
}
