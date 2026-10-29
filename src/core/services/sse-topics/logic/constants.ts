/**
 * Control messages are published on the user's events channel (`sse:events:user:{userId}`),
 * next to the user's events (the data messages).
 * Control messages tell the nodes holding the user's connections to update them;
 * they are never forwarded to the browser.
 */
export const SseControlTypes = {
  TopicJoined: 'topic-joined',
  TopicLeft: 'topic-left',
  /**
   * The user's session ended (e.g. logout): every node closes the user's open connections.
   */
  SessionEnded: 'session-ended',
} as const;

export type SseControlTypeValues = (typeof SseControlTypes)[keyof typeof SseControlTypes];

export const VALID_SSE_CONTROL_TYPES = new Set<string>(Object.values(SseControlTypes));

/**
 * Max topics a single user can be in. Every new connection of the user subscribes to all of them,
 * so an unbounded set would make each connect fan out into an unbounded number of Redis subscriptions.
 */
export const SSE_MAX_TOPICS_PER_USER = 100;

/**
 * Returned by the add-user-to-topic script when the user is already in {@link SSE_MAX_TOPICS_PER_USER} topics.
 */
export const ADD_USER_TO_TOPIC_LIMIT_REACHED = -1;
