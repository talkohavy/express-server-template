export const SSE_EVENTS_CHANNEL = 'sse:events';

export const SSE_SIMULATION_INTERVAL_MS = 1000;

/**
 * Must stay below the idle timeout of every proxy / load balancer in front of the server (commonly 60s).
 */
export const SSE_HEARTBEAT_INTERVAL_MS = 25_000;

export const SseEventNames = {
  Connected: 'connected',
  Message: 'message',
} as const;

export type SseEventNameValues = (typeof SseEventNames)[keyof typeof SseEventNames];
