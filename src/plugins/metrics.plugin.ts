import { collectDefaultMetrics, Counter, Registry } from 'prom-client';
import type { Application } from 'express';

export async function metricsPlugin(app: Application) {
  const registry = new Registry();

  collectDefaultMetrics({ register: registry });

  const cacheHits = new Counter<'entity'>({
    name: 'cache_hits_total',
    help: 'Total number of cache hits by entity',
    labelNames: ['entity'],
    registers: [registry],
  });

  const cacheMisses = new Counter<'entity'>({
    name: 'cache_misses_total',
    help: 'Total number of cache misses by entity',
    labelNames: ['entity'],
    registers: [registry],
  });

  // Migration observability: the shadow-read divergence counter is the gate a
  // Mongo→Postgres cutover is judged by (proceed only once it flatlines at ~0),
  // and the dual-write-failure counter surfaces secondary-store drift to reconcile.
  const migrationDivergences = new Counter<'entity' | 'operation'>({
    name: 'migration_divergences_total',
    help: 'Total shadow-read divergences between the primary and secondary store',
    labelNames: ['entity', 'operation'],
    registers: [registry],
  });

  const dualWriteFailures = new Counter<'entity' | 'operation'>({
    name: 'dual_write_failures_total',
    help: 'Total best-effort secondary-store write failures during dual-write',
    labelNames: ['entity', 'operation'],
    registers: [registry],
  });

  app.metrics = { registry, cacheHits, cacheMisses, migrationDivergences, dualWriteFailures };
}
