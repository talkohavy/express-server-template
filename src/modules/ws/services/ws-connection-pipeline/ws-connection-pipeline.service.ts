import { createPipeline } from '@src/common/utils/createPipeline';
import { BUILT_IN_WEBSOCKET_EVENTS } from '@src/core/services/topic-subscriber';
import type { WebSocketServer } from 'ws';
import type { IConnectionPipeline } from '../../types';

/**
 * Registers a single `connection` listener and runs all steps as a composed pipeline.
 * Each step must call `next()` to proceed; omitting it stops the chain early.
 */
export class WsConnectionPipelineService {
  constructor(private readonly wsApp: WebSocketServer) {}

  register(wsMiddlewares: IConnectionPipeline[]): void {
    const pipeline = createPipeline(wsMiddlewares.map((m) => m.handleConnection.bind(m)));

    this.wsApp.on(BUILT_IN_WEBSOCKET_EVENTS.Connection, async (socket, request) => {
      await pipeline({ socket, request });
    });
  }
}
