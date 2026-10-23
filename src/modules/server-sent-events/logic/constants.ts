export const SSE_EVENTS_CHANNEL = 'sse:events';

export const SSE_SIMULATION_INTERVAL_MS = 1000;

export const SseEventNames = {
  Connected: 'connected',
  Message: 'message',
} as const;

export type SseEventNameValues = (typeof SseEventNames)[keyof typeof SseEventNames];
