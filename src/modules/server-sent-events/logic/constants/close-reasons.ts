export const SseCloseReasons = {
  SlowClient: 'slow-client',
  DrainTimeout: 'drain-timeout',
  Shutdown: 'shutdown',
  /**
   * The access token the connection was opened with expired. The client reconnects with its current cookie;
   * if that one is expired too, it gets a 401, and must refresh the token and create a new `EventSource`.
   */
  TokenExpired: 'token-expired',
  /**
   * The login session the connection was opened with ended (e.g. logout), see `SseTopicsService.closeSessionConnections`.
   */
  SessionEnded: 'session-ended',
} as const;

export type SseCloseReasonValues = (typeof SseCloseReasons)[keyof typeof SseCloseReasons];
