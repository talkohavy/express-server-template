import type { Response } from 'express';

export type SseConnection = {
  socketId: string;
  userId: string;
  response: Response;
  connectedAt: number;
  /**
   * The topics this connection receives events of.
   * Left intact on unregister, so the close handler can still release their subscriptions.
   */
  topics: Set<string>;
  /**
   * Set while the connection is back-pressured; cleared once the response emits `drain`.
   */
  drainTimeout: NodeJS.Timeout | null;
};
