export const SseCloseReasons = {
  SlowClient: 'slow-client',
  DrainTimeout: 'drain-timeout',
  Shutdown: 'shutdown',
} as const;

export type SseCloseReasonValues = (typeof SseCloseReasons)[keyof typeof SseCloseReasons];
