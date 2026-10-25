import { SSE_HEARTBEAT_INTERVAL_MS } from './heartbeat';

/**
 * Max open SSE connections per user across the whole cluster (every tab and device counts).
 */
export const SSE_MAX_CONNECTIONS_PER_USER = 10;

/**
 * How long a connection's lease in Redis stays valid without a refresh.
 * Leases are refreshed on every heartbeat, so a live connection survives 3 missed refreshes.
 * When a node crashes, its leases stop being refreshed and free up after this long.
 */
export const SSE_CONNECTION_LEASE_TTL_MS = SSE_HEARTBEAT_INTERVAL_MS * 4;
