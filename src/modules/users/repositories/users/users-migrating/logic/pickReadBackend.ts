import type { ReadBackend } from '../types';

/**
 * Decides which store serves a single read, honouring the canary ramp.
 *
 * The canary is STICKY per join key (a deterministic hash of the key), not random:
 * a given user is always routed the same way within a canary percentage, so a user
 * doesn't flip-flop between stores request-to-request. Deterministic routing is also
 * what makes the canary safe to reason about and reproduce.
 *
 * Only ramps mongo→postgres. Once `readBackend` is already `postgres`, everything
 * reads Postgres regardless of the percentage.
 */
export function pickReadBackend(props: {
  readBackend: ReadBackend;
  canaryPercent: number;
  key: string | undefined;
}): ReadBackend {
  const { readBackend, canaryPercent, key } = props;

  if (readBackend === 'postgres') return 'postgres';
  if (canaryPercent <= 0 || !key) return 'mongo';
  if (canaryPercent >= 100) return 'postgres';

  const bucket = hashToBucket(key);
  const isInCanary = bucket < canaryPercent;
  const chosen: ReadBackend = isInCanary ? 'postgres' : 'mongo';

  return chosen;
}

/**
 * Maps an arbitrary string to a stable bucket in [0, 100). Simple FNV-1a-ish hash —
 * deterministic and dependency-free (no Math.random, so it's reproducible).
 */
function hashToBucket(key: string): number {
  let hash = 2166136261;

  for (let index = 0; index < key.length; index++) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const bucket = Math.abs(hash) % 100;

  return bucket;
}
