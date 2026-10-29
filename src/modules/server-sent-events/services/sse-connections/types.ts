import type { SseConnection } from '../../types';

export type SendToConnectionProps = {
  connectionId: string;
  message: string;
};

export type WriteProps = {
  connection: SseConnection;
  message: string;
};
