const PEM_PREFIX = '-----BEGIN';

/**
 * value is either a raw PEM, or a base64-encoded PEM (which fits on a single env line).
 */
export function decodePemKey(value: string): string {
  if (value.startsWith(PEM_PREFIX)) return value;

  const pem = Buffer.from(value, 'base64').toString('utf8');

  return pem;
}
