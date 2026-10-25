import type { Response } from 'express';
import type { SseCloseReasonValues } from '../../logic/constants';
import type { SseConnection } from '../../types';

export type RegisterConnectionProps = {
  socketId: string;
  userId: string;
  response: Response;
};

export type SendToConnectionProps = {
  socketId: string;
  message: string;
};

export type WriteProps = {
  connection: SseConnection;
  message: string;
};

export type DestroyConnectionProps = {
  connection: SseConnection;
  reason: SseCloseReasonValues;
};
