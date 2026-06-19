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

  app.metrics = { registry, cacheHits, cacheMisses };
}
