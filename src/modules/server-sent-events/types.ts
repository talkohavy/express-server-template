import type { Response } from 'express';

export type SseConnection = {
  id: string;
  response: Response;
  connectedAt: number;
};

/**
 * The envelope published to Redis and fanned out to SSE clients.
 */
export type SseEnvelope = {
  event: string;
  data: unknown;
};
