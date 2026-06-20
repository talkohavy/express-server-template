import type { IncomingMessage } from 'node:http';
import type { WebSocket } from 'ws';

/**
 * Per-connection context passed through the WebSocket connection pipeline (single ordered chain).
 */
export type WsConnectionContext = {
  socket: WebSocket;
  request: IncomingMessage;
};

/**
 * One step in the connection pipeline. Call `next()` to proceed to the next step;
 * omit the call to stop the chain (e.g. on validation failure).
 */
export interface IConnectionPipeline {
  handleConnection(props: WsConnectionContext, next: () => void): Promise<void> | void;
}

export type ActionHandler = (...args: any) => Promise<void>;

export type WsMiddleware = (...args: any) => Promise<void> | void;
