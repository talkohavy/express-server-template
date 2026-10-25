export const SSE_EVENTS_CHANNEL = 'sse:events';

/**
 * One channel per user: `sse:events:user:{userId}`.
 * A node subscribes to it only while it holds at least one connection of that user,
 * so a message for a user reaches only the nodes that can deliver it.
 */
export const SSE_USER_EVENTS_CHANNEL_PREFIX = 'sse:events:user:';
