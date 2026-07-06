import type { Counter, Registry } from 'prom-client';

export type AppMetrics = {
  registry: Registry;
  cacheHits: Counter<'entity'>;
  cacheMisses: Counter<'entity'>;
  migrationDivergences: Counter<'entity' | 'operation'>;
  dualWriteFailures: Counter<'entity' | 'operation'>;
};
