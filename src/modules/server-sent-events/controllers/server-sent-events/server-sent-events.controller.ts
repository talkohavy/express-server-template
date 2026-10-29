import { API_PATHS, StatusCodes } from '@src/common/constants';
import { SSE_RETRY_MS, SseEventNames } from '../../logic/constants';
import { formatSseMessage } from '../../logic/utils/format-sse-message';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { SseConnectionsService } from '../../services/sse-connections';
import type { SseConnection } from '../../types';

export class ServerSentEventsController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly sseConnectionsService: SseConnectionsService,
  ) {}

  registerRoutes() {
    this.connect();
  }

  private connect() {
    this.app.get(API_PATHS.sse, (req: Request, res: Response) => {
      res.status(StatusCodes.OK);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      // Disables response buffering in nginx, which would otherwise hold events back.
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      req.socket.setNoDelay(true);

      const connection = this.sseConnectionsService.register(res);

      this.sendConnectedMessage(connection);

      res.on('close', () => {
        this.sseConnectionsService.unregister(connection.id);
      });
    });
  }

  private sendConnectedMessage(connection: SseConnection) {
    const connectedDataAsString = JSON.stringify({ connectionId: connection.id });

    const connectedMessage = formatSseMessage({
      event: SseEventNames.Connected,
      data: connectedDataAsString,
      retry: SSE_RETRY_MS,
    });

    this.sseConnectionsService.send({
      connectionId: connection.id,
      message: connectedMessage,
    });
  }
}
