export const SseCloseReasons = {
  Shutdown: 'shutdown',
} as const;

export type SseCloseReasonValues = (typeof SseCloseReasons)[keyof typeof SseCloseReasons];
