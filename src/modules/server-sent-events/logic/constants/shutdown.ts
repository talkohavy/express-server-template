/**
 * On shutdown, every client receives a random `retry:` in [MIN, MIN + JITTER), so reconnections
 * are spread out instead of hitting the remaining nodes all at once.
 */
export const SSE_SHUTDOWN_RETRY_MIN_MS = 1000;
export const SSE_SHUTDOWN_RETRY_JITTER_MS = 5000;

/**
 * Upper bound on how long shutdown waits for the final messages to flush before giving up.
 */
export const SSE_SHUTDOWN_FLUSH_TIMEOUT_MS = 2000;
