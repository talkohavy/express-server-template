/**
 * A connection whose unsent buffer grows beyond this size is considered too slow and is destroyed.
 */
export const SSE_MAX_BUFFERED_BYTES = 1024 * 1024; // <--- 1MB

/**
 * How long a connection may stay back-pressured (waiting for `drain`) before it is destroyed.
 */
export const SSE_DRAIN_TIMEOUT_MS = 30_000; // <--- 30 seconds
