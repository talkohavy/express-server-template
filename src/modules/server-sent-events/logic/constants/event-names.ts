export const SseEventNames = {
  Connected: 'connected',
  Message: 'message',
} as const;

export type SseEventNameValues = (typeof SseEventNames)[keyof typeof SseEventNames];
