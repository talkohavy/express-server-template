/**
 * The event names the demo publishes. A browser's `EventSource` only receives the names it listens to.
 */
export const SseDemoEventNames = {
  TopicMessage: 'topic-message',
  UserMessage: 'user-message',
} as const;

export type SseDemoEventNameValues = (typeof SseDemoEventNames)[keyof typeof SseDemoEventNames];

/**
 * Keeps every envelope far below `SSE_MAX_ENVELOPE_BYTES`, so publishing never fails on size.
 */
export const SSE_DEMO_MAX_TEXT_LENGTH = 500;

export const SSE_DEMO_MAX_TOPIC_LENGTH = 100;
