import type { SseCloseReasonValues } from '../../logic/constants';
import type { SseConnection } from '../../types';

export type SendToConnectionProps = {
  connectionId: string;
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
