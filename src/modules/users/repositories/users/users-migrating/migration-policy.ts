import type { MigrationConfig, ReadBackend, WriteMode } from './types';

/**
 * Single source of truth for "where are we in the migration right now".
 *
 * Defaults come from env vars (so a fresh boot starts in a known phase), but every
 * setting can be overridden in-memory at runtime. That runtime override is the
 * mechanism that makes phase transitions (e.g. flipping reads to Postgres) a flag
 * flip rather than a deploy — and therefore instantly reversible.
 *
 * In a real deployment you'd back the overrides with Redis / LaunchDarkly so all
 * instances agree; for this template an in-process store keeps the pattern legible.
 */
export class MigrationPolicy {
  private overrides: Partial<MigrationConfig> = {};

  private readonly defaults: MigrationConfig;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    // Defaults MUST match the store the app currently runs on (Postgres) so that,
    // with no env set, this whole layer is a no-op at rest — same behaviour as before
    // it existed. The migration then ADVANCES by flipping flags, never by a code deploy.
    // Defaulting to Mongo here would silently repoint every read/write at startup.
    this.defaults = {
      readBackend: env.USERS_MIGRATION_READ_BACKEND === 'mongo' ? 'mongo' : 'postgres',
      writeMode: MigrationPolicy.parseWriteMode(env.USERS_MIGRATION_WRITE_MODE),
      shadowRead: env.USERS_MIGRATION_SHADOW_READ === 'true',
      readCanaryPercent: MigrationPolicy.parsePercent(env.USERS_MIGRATION_READ_CANARY_PERCENT),
    };
  }

  private static parseWriteMode(raw: string | undefined): WriteMode {
    if (raw === 'mongo' || raw === 'dual') return raw;
    return 'postgres';
  }

  private static parsePercent(raw: string | undefined): number {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return 0;
    const clamped = Math.min(100, Math.max(0, parsed));
    return clamped;
  }

  getReadBackend(): ReadBackend {
    const readBackend = this.overrides.readBackend ?? this.defaults.readBackend;
    return readBackend;
  }

  getWriteMode(): WriteMode {
    const writeMode = this.overrides.writeMode ?? this.defaults.writeMode;
    return writeMode;
  }

  isShadowReadEnabled(): boolean {
    const shadowRead = this.overrides.shadowRead ?? this.defaults.shadowRead;
    return shadowRead;
  }

  getReadCanaryPercent(): number {
    const readCanaryPercent = this.overrides.readCanaryPercent ?? this.defaults.readCanaryPercent;
    return readCanaryPercent;
  }

  /**
   * Returns the store that is currently authoritative for writes — i.e. the source
   * of truth the secondary is reconciled against. It tracks the read backend so that
   * authoritative reads and authoritative writes never disagree.
   */
  getPrimaryWriteBackend(): ReadBackend {
    const primary = this.getReadBackend();
    return primary;
  }

  setReadBackend(readBackend: ReadBackend): void {
    this.overrides.readBackend = readBackend;
  }

  setWriteMode(writeMode: WriteMode): void {
    this.overrides.writeMode = writeMode;
  }

  setShadowRead(shadowRead: boolean): void {
    this.overrides.shadowRead = shadowRead;
  }

  setReadCanaryPercent(readCanaryPercent: number): void {
    this.overrides.readCanaryPercent = MigrationPolicy.parsePercent(String(readCanaryPercent));
  }

  getSnapshot(): MigrationConfig {
    const snapshot: MigrationConfig = {
      readBackend: this.getReadBackend(),
      writeMode: this.getWriteMode(),
      shadowRead: this.isShadowReadEnabled(),
      readCanaryPercent: this.getReadCanaryPercent(),
    };
    return snapshot;
  }
}
