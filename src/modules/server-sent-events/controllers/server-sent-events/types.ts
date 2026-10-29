import type { Request, Response } from 'express';

export type ReleaseConnectionResourcesProps = {
  userId: string;
  socketId: string;
};

export type OpenConnectionProps = {
  req: Request;
  res: Response;
  userId: string;
  sessionId: string;
  socketId: string;
  /**
   * When the connection's access token expires (ms since the epoch).
   */
  expiresAt: number;
};
