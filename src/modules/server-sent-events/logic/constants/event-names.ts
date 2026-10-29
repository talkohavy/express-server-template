export const SseEventNames = {
  Connected: 'connected',
} as const;

export type SseEventNameValues = (typeof SseEventNames)[keyof typeof SseEventNames];
