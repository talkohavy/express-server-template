import { createHash } from 'node:crypto';
import type { WidgetQuery } from '../types';

/**
 * Builds a stable Redis cache key for a widget query + caller role.
 * Deterministic regardless of object key order, so equivalent queries
 * (structurally) always hash to the same key.
 */
export function buildCacheKey(query: WidgetQuery, role: string): string {
  const sortedFilters = [...(query.filters ?? [])].sort((a, b) => a.field.localeCompare(b.field));

  const cacheableShape = {
    dataset: query.dataset,
    dimensions: query.dimensions ?? [],
    measures: query.measures ?? [],
    filters: sortedFilters,
    timeRange: query.timeRange ?? null,
    sort: query.sort ?? [],
    limit: query.limit ?? null,
    offset: query.offset ?? null,
    role,
  };

  const hash = createHash('sha1').update(stableStringify(cacheableShape)).digest('hex');

  return `dataQuery:${hash}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const entries = sortedKeys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}
