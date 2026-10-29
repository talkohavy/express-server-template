import type { Response } from 'express';

export type SseConnection = {
  socketId: string;
  userId: string;
  sessionId: string;
  response: Response;
  /**
   * When the access token the connection was opened with expires (ms since the epoch).
   * Implementation-wise: the connection is closed at the first heartbeat past it.
   */
  expiresAt: number;
  /**
   * The topics routed to this connection. Routing only: the Redis subscriptions it holds are tracked by
   * SseChannelSubscriberService under its socketId, and released from there.
   */
  topics: Set<string>;
  /**
   * Set while the connection is back-pressured; cleared once the response emits `drain`.
   */
  drainTimeout: NodeJS.Timeout | null;
};
