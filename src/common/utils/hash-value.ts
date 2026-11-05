import { createHash } from 'node:crypto';

export function hashValue(value: string): string {
  const valueHash = createHash('sha256').update(value).digest('hex');

  return valueHash;
}
