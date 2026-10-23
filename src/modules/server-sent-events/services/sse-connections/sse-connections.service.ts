import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { LoggerService } from '@src/core/services/logger';
import type { SseConnection } from '../../types';
import type { SendToConnectionProps, WriteProps } from './types';

/**
 * Registry of the SSE connections held by this node (in memory only).
 * Writes pre-serialized messages to connections; it knows nothing about Redis.
 */
export class SseConnectionsService {
  private readonly connections = new Map<string, SseConnection>();

  constructor(private readonly logger: LoggerService) {}

  register(response: Response): SseConnection {
    const connection: SseConnection = {
      id: randomUUID(),
      response,
      connectedAt: Date.now(),
    };

    this.connections.set(connection.id, connection);

    this.logger.debug('SSE connection registered', {
      connectionId: connection.id,
      connectionsCount: this.connections.size,
    });

    return connection;
  }

  unregister(connectionId: string): void {
    const wasRemoved = this.connections.delete(connectionId);

    if (!wasRemoved) return;

    this.logger.debug('SSE connection unregistered', { connectionId, connectionsCount: this.connections.size });
  }

  /**
   * @returns true if the message was written, false if the connection is unknown or already closed.
   */
  send(props: SendToConnectionProps): boolean {
    const { connectionId, message } = props;

    const connection = this.connections.get(connectionId);

    if (!connection) return false;

    const isWritten = this.write({ connection, message });

    return isWritten;
  }

  sendToAll(message: string): void {
    this.connections.forEach((connection) => {
      this.write({ connection, message });
    });
  }

  getConnectionsCount(): number {
    return this.connections.size;
  }

  private write(props: WriteProps): boolean {
    const { connection, message } = props;
    const { response } = connection;

    if (response.writableEnded || response.destroyed) return false;

    try {
      response.write(message);

      return true;
    } catch (error) {
      this.logger.error('Failed to write SSE message', { connectionId: connection.id, error });

      return false;
    }
  }
}
