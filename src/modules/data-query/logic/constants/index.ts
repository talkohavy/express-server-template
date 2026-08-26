export * from './default-data-sets';
export * from './dimension-value-types';
export * from './filter-operators';
export * from './measure-aggregations';
export * from './time-range-granularities';

/**
 * Short TTL: dashboards re-request the same aggregates constantly, so even a
 * small cache window meaningfully cuts load, without serving very stale data.
 */
export const CACHE_TTL_SECONDS = 30;

/**
 * Default limit for queries.
 */
export const DEFAULT_LIMIT = 100;
