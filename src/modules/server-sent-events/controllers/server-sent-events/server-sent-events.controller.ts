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
import type { OpenConnectionProps, ReleaseConnectionResourcesProps } from './types';

export class ServerSentEventsController implements ControllerFactory {
  /**
   * Before this, we only counted connections that got registered.
   * That meant that a burst of connections could all pass the check before any of them registered.
   * With this, connections that passed the per-node check but aren't registered yet, will be counted as well.
   */
  private pendingConnectionsCount = 0;

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
      // Step 1: If this node is shutting down or full, reject before touching Redis.
      this.assertCanConnect();

      const { id: userId, sid: sessionId, exp } = req.user as UserToken;

      const socketId = randomUUID();

      // Step 2: Reserve a slot on this node until the connection is registered (or dropped).
      this.pendingConnectionsCount++;

      try {
        await this.openConnection({ req, res, userId, sessionId, socketId, expiresAt: exp * 1000 });
      } finally {
        this.pendingConnectionsCount--;
      }
    });
  }

  private async openConnection(props: OpenConnectionProps): Promise<void> {
    const { req, res, userId, sessionId, socketId, expiresAt } = props;

    /**
     * Previously, before this variable came to be,
     * we had used req.socket.destroyed in the below if statement to detect if the client left.
     * Now, we use this variable instead.
     */
    let isClosed = false;

    res.once('close', () => {
      isClosed = true;
      this.sseConnectionsService.unregister(socketId);
      this.releaseConnectionResources({ userId, socketId });
    });

    // Step 2: Acquire a lease, to enforce the per-user limit across the cluster.
    const isLeaseAcquired = await this.sseConnectionLimiterService.acquire({ userId, socketId });

    if (!isLeaseAcquired) {
      throw new TooManyRequestsError(`Reached the limit of ${SSE_MAX_CONNECTIONS_PER_USER} SSE connections per user`);
    }

    // Step 3: Make this node receive the user's messages. Done before the stream opens, so `connected` (sent by sendConnectedMessage) means it's live.
    const isSubscribed = await this.serverSentEventsService.subscribeToUserEvents({ userId, socketId });

    if (!isSubscribed) {
      throw new ServiceUnavailableError('Failed to subscribe to user events');
    }

    // Step 4: Make this node receive the events of the user's topics.
    // Note: during this step, control messages may arrive. They will be held for the socket until the topics are loaded.
    const topics = await this.serverSentEventsService.subscribeToUserTopics({ userId, socketId });

    if (!topics) {
      throw new ServiceUnavailableError('Failed to subscribe to topic events');
    }

    // Step 5: The client may have left during the steps above. Its 'close' already released, before some of the subscriptions above were taken, so release again.
    if (isClosed) {
      this.serverSentEventsService.completeTopicsLoad({ userId, socketId });

      await this.releaseConnectionResources({ userId, socketId });

      return;
    }

    // Step 6: Shutdown may have started during the steps above. Closing the response releases what was taken.
    if (!this.sseConnectionsService.isAcceptingConnections()) {
      throw new ServiceUnavailableError('Server is shutting down');
    }

    // Step 7: Open the stream and register the connection.
    res.status(StatusCodes.OK);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Disables response buffering in nginx, which would otherwise hold events back.
    res.setHeader('X-Accel-Buffering', 'no');
    /**
     * flushHeaders() writes the 200, and Content-Type: text/event-stream to the socket (see headers set above).
     * That commits the HTTP response and turns this request into a long-lived stream.
     * The browser's EventSource, upon receiving the response, treats this as the stream connection opening.
     */
    res.flushHeaders();

    req.socket.setNoDelay(true);

    const connection = this.sseConnectionsService.register({
      socketId,
      userId,
      sessionId,
      topics,
      expiresAt,
      response: res,
    });

    // Step 8: Apply the topic changes that arrived while the topics were loading. Must directly follow register.
    this.serverSentEventsService.completeTopicsLoad({ userId, socketId });

    this.sendConnectedMessage(connection);
  }

  /**
   * Undoes the lease and every subscription the connection holds, whatever state it reached. Idempotent.
   * Every promise is wrapped in a try-catch, so this never throws.
   */
  private async releaseConnectionResources(props: ReleaseConnectionResourcesProps): Promise<void> {
    const { userId, socketId } = props;

    await Promise.all([
      this.sseConnectionLimiterService.release({ userId, socketId }),
      this.serverSentEventsService.releaseConnectionSubscriptions(socketId),
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

  /**
   * If this node is shutting down, or full (max connections per node reached, counting the ones still opening),
   * reject before touching Redis
   */
  private assertCanConnect() {
    if (!this.sseConnectionsService.isAcceptingConnections()) {
      throw new ServiceUnavailableError('Server is shutting down');
    }

    const connectionsCount = this.sseConnectionsService.getConnectionsCount() + this.pendingConnectionsCount;

    if (connectionsCount >= SSE_MAX_CONNECTIONS_PER_NODE) {
      throw new ServiceUnavailableError(
        `Reached the limit of ${SSE_MAX_CONNECTIONS_PER_NODE} SSE connections per node`,
      );
    }
  }
}
