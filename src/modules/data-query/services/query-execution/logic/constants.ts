export const QueryStatuses = {
  Ok: 'ok',
  Error: 'error',
} as const;

export type QueryStatusValues = (typeof QueryStatuses)[keyof typeof QueryStatuses];

/**
 * Short TTL: dashboards re-request the same aggregates constantly, so even a
 * small cache window meaningfully cuts load, without serving very stale data.
 */
export const CACHE_TTL_SECONDS = 30;
