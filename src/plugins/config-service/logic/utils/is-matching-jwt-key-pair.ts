import { createPublicKey } from 'node:crypto';

type IsMatchingJwtKeyPairProps = {
  privateKeyPem: string;
  publicKeyPem: string;
};

export function isMatchingJwtKeyPair(props: IsMatchingJwtKeyPairProps): boolean {
  const { privateKeyPem, publicKeyPem } = props;

  const derivedPublicKey = createPublicKey(privateKeyPem);
  const publicKey = createPublicKey(publicKeyPem);
  const isMatching = derivedPublicKey.equals(publicKey);

  return isMatching;
}
