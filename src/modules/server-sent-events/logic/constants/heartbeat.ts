/**
 * Must stay below the idle timeout of every proxy / load balancer in front of the server (commonly 60s).
 */
export const SSE_HEARTBEAT_INTERVAL_MS = 25_000;
