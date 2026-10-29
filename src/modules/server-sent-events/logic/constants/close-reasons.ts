export const SseCloseReasons = {
  SlowClient: 'slow-client',
  DrainTimeout: 'drain-timeout',
  Shutdown: 'shutdown',
  /**
   * The user's session ended (e.g. logout), see `SseTopicsService.closeUserConnections`.
   */
  SessionEnded: 'session-ended',
} as const;

export type SseCloseReasonValues = (typeof SseCloseReasons)[keyof typeof SseCloseReasons];
