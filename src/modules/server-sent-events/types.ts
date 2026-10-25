import type { Response } from 'express';

export type SseConnection = {
  socketId: string;
  userId: string;
  response: Response;
  connectedAt: number;
  /**
   * Set while the connection is back-pressured; cleared once the response emits `drain`.
   */
  drainTimeout: NodeJS.Timeout | null;
};
