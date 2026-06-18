import type { Server as SocketIOServer } from 'socket.io';
import type { LoggerService } from '@src/core/services/logger';
import type { MiddlewareFactory } from '@src/lib/lucky-server';
import type { SocketType } from '../types';

export class AuthenticationMiddleware implements MiddlewareFactory {
  constructor(
    private readonly socketIOApp: SocketIOServer,
    private readonly logger: LoggerService,
  ) {}

  use() {
    this.socketIOApp.use((socket: SocketType, next: (err?: any) => void) => {
      this.authenticateSocket(socket);

      next();
    });
  }

  private async authenticateSocket(socket: SocketType) {
    this.logger.debug('Authenticating socket', { socketId: socket.id });

    socket.data.user = { id: '123' }; // <--- fake user id for testing purposes.
  }
}
