export const BUILT_IN_WEBSOCKET_EVENTS = {
  Connection: 'connection',
  Error: 'error',
  Close: 'close',
  Ping: 'ping',
  Pong: 'pong',
  Message: 'message',
} as const;

/**
 * Default TTL in seconds for topic/socket keys. Orphaned keys expire after this; active keys are refreshed on every use.
 */
export const DEFAULT_TOPIC_KEY_TTL_SECONDS = 60 * 60 * 1; // <--- 1 hour

export const TOPICS_GROUP_KEY = 'ws:topics';
