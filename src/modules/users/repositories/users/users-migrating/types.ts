/**
 * Which store a read is served from.
 */
export type ReadBackend = 'mongo' | 'postgres';

/**
 * How writes are dispatched during the migration.
 *
 * - `mongo` / `postgres`: single-store write (before dual-write starts, or after contract).
 * - `dual`: write to BOTH. The current read backend is the authoritative "primary"
 *   (its write must succeed); the other store is a best-effort "secondary"
 *   (failures are metered, never thrown).
 */
export type WriteMode = 'mongo' | 'postgres' | 'dual';

/**
 * Runtime-resolvable migration configuration. Every field is a flag that can be
 * flipped at runtime (env default + in-memory override) so migration phases advance
 * WITHOUT a code deploy — which is what makes each step instantly reversible.
 */
export type MigrationConfig = {
  readBackend: ReadBackend;
  writeMode: WriteMode;
  /**
   * When true, reads also query the non-authoritative store, compare the results
   * on the intersecting field set, and emit a divergence metric. The user always
   * gets the authoritative store's result.
   */
  shadowRead: boolean;
  /**
   * 0–100. When `readBackend` is `mongo`, this fraction of reads is deterministically
   * (stickily, by join key) routed to Postgres instead — a canary ramp before a full flip.
   */
  readCanaryPercent: number;
};
