/**
 * Control messages are published on the user's events channel (`sse:events:user:{userId}`),
 * next to the user's events (the data messages).
 * Control messages tell the nodes holding the user's connections to update them;
 * they are never forwarded to the browser.
 */
export const SseControlTypes = {
  TopicJoined: 'topic-joined',
  TopicLeft: 'topic-left',
} as const;

export type SseControlTypeValues = (typeof SseControlTypes)[keyof typeof SseControlTypes];

export const VALID_SSE_CONTROL_TYPES = new Set<string>(Object.values(SseControlTypes));
