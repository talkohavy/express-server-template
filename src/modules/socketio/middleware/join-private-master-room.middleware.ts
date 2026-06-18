import { getMasterRoomByUserId } from '../logic/utils/getMasterRoomByUserId';
import type { Server as SocketIOServer } from 'socket.io';
import type { LoggerService } from '@src/core/services/logger';
import type { SocketType } from '../types';

export class JoinPrivateMasterRoomMiddleware {
  constructor(
    private readonly socketIOApp: SocketIOServer,
    private readonly logger: LoggerService,
  ) {}

  use() {
    this.socketIOApp.use((socket: SocketType, next: (err?: any) => void) => {
      this.subscribeSocketToPrivateMasterRoom(socket);

      next();
    });
  }

  private async subscribeSocketToPrivateMasterRoom(socket: SocketType): Promise<void> {
    const userId = socket.data.user.id;

    const masterRoomName = getMasterRoomByUserId(userId);

    await socket.join(masterRoomName);

    this.logger.debug(`socket joined user private master room. userId: ${userId} - socketId: ${socket.id}`);
  }
}
