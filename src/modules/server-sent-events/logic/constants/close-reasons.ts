export const SseCloseReasons = {
  SlowClient: 'slow-client',
  DrainTimeout: 'drain-timeout',
  Shutdown: 'shutdown',
  /**
   * The login session the connection was opened with ended (e.g. logout), see `SseTopicsService.closeSessionConnections`.
   */
  SessionEnded: 'session-ended',
} as const;

export type SseCloseReasonValues = (typeof SseCloseReasons)[keyof typeof SseCloseReasons];
