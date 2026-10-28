/**
 * One channel per user: `sse:events:user:{userId}`.
 * A node subscribes to it only while it holds at least one connection of that user,
 * so a message for a user reaches only the nodes that can deliver it.
 */
export const SSE_USER_EVENTS_CHANNEL_PREFIX = 'sse:events:user:';

/**
 * One channel per topic: `sse:events:topic:{topic}`.
 * A node subscribes to it only while it holds at least one connection in that topic,
 * so a message for a topic reaches only the nodes that can deliver it, once per node.
 */
export const SSE_TOPIC_EVENTS_CHANNEL_PREFIX = 'sse:events:topic:';

/**
 * The SSE spec's default event name: `EventSource.onmessage` receives it.
 */
export const SSE_DEFAULT_EVENT_NAME = 'message';
