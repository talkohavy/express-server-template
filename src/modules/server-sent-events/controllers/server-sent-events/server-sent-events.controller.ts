import { randomUUID } from 'node:crypto';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { ServiceUnavailableError, TooManyRequestsError } from '@src/core/errors';
import {
  SSE_MAX_CONNECTIONS_PER_NODE,
  SSE_MAX_CONNECTIONS_PER_USER,
  SSE_RETRY_MS,
  SseEventNames,
} from '../../logic/constants';
import { formatSseMessage } from '../../logic/utils/format-sse-message';
import type { Application, Request, Response } from 'express';
import type { UserToken } from '@src/common/types';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { ServerSentEventsService } from '../../services/server-sent-events';
import type { SseConnectionLimiterService } from '../../services/sse-connection-limiter';
import type { SseConnectionsService } from '../../services/sse-connections';
import type { SseConnection } from '../../types';
import type { ReleaseConnectionResourcesProps } from './types';

export class ServerSentEventsController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly sseConnectionsService: SseConnectionsService,
    private readonly sseConnectionLimiterService: SseConnectionLimiterService,
    private readonly serverSentEventsService: ServerSentEventsService,
  ) {}

  registerRoutes() {
    this.connect();
  }

  private connect() {
    this.app.get(API_PATHS.sse, async (req: Request, res: Response) => {
      const { id: userId } = req.user as UserToken;

      const socketId = randomUUID();

      // Step 1: If this node is full, reject before touching Redis
      const connectionsCount = this.sseConnectionsService.getConnectionsCount();

      if (connectionsCount >= SSE_MAX_CONNECTIONS_PER_NODE) {
        throw new ServiceUnavailableError(
          `Reached the limit of ${SSE_MAX_CONNECTIONS_PER_NODE} SSE connections per node`,
        );
      }

      // Step 2: Acquire a lease to prevent too many connections
      const isLeaseAcquired = await this.sseConnectionLimiterService.acquire({ userId, socketId });

      // Step 3: If the lease was not acquired, throw an error
      if (!isLeaseAcquired) {
        throw new TooManyRequestsError(`Reached the limit of ${SSE_MAX_CONNECTIONS_PER_USER} SSE connections per user`);
      }

      // Step 4: Make this node receive the user's messages. Done before the stream opens, so `connected` means it's live.
      const isSubscribed = await this.serverSentEventsService.subscribeToUserEvents(userId);

      if (!isSubscribed) {
        await this.releaseConnectionResources({ userId, socketId });

        throw new ServiceUnavailableError('Failed to subscribe to user events');
      }

      // Step 5: The client may have left during the steps above. Its 'close' already fired, so release here.
      if (req.socket.destroyed) {
        await this.releaseConnectionResources({ userId, socketId });

        return;
      }

      res.status(StatusCodes.OK);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      // Disables response buffering in nginx, which would otherwise hold events back.
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      req.socket.setNoDelay(true);

      const connection = this.sseConnectionsService.register({ socketId, userId, response: res });

      this.sendConnectedMessage(connection);

      res.on('close', () => {
        this.sseConnectionsService.unregister(socketId);
        this.releaseConnectionResources({ userId, socketId });
      });
    });
  }

  /**
   * Undoes the lease and the subscription taken in connect.
   * Both promises are wrapped in a try-catch, so this never throws.
   */
  private async releaseConnectionResources(props: ReleaseConnectionResourcesProps): Promise<void> {
    const { userId, socketId } = props;

    await Promise.all([
      this.sseConnectionLimiterService.release({ userId, socketId }),
      this.serverSentEventsService.unsubscribeFromUserEvents(userId),
    ]);
  }

  private sendConnectedMessage(connection: SseConnection) {
    const { socketId } = connection;

    const connectedDataAsString = JSON.stringify({ socketId });

    const connectedMessage = formatSseMessage({
      event: SseEventNames.Connected,
      data: connectedDataAsString,
      retry: SSE_RETRY_MS,
    });

    this.sseConnectionsService.send({
      socketId,
      message: connectedMessage,
    });
  }
}
