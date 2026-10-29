import type { Response } from 'express';

export type SseConnection = {
  id: string;
  response: Response;
  connectedAt: number;
  /**
   * Set while the connection is back-pressured; cleared once the response emits `drain`.
   */
  drainTimeout: NodeJS.Timeout | null;
};

/**
 * The envelope published to Redis and fanned out to SSE clients.
 */
export type SseEnvelope = {
  event: string;
  data: unknown;
};
