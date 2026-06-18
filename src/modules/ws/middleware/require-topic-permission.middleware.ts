import { sendPermissionDeniedResponse } from '../logic/utils/sendPermissionDeniedResponse';
import type { WebSocket } from 'ws';
import type { TopicMessage, TopicPayload } from '@src/common/types';
import type { LoggerService } from '@src/core/services/logger';
import type { MiddlewareFactory } from '@src/lib/lucky-server';

export class RequireTopicPermissionMiddleware implements MiddlewareFactory {
  constructor(private readonly logger: LoggerService) {}

  use() {
    return async (socket: WebSocket, message: TopicMessage, next: () => void) => {
      const { payload } = message;

      const userPermissions = {};

      const isAllowed = await this.checkPermission({ socket, payload, userPermissions });

      if (!isAllowed) {
        this.logger.debug('Require action permission: permission denied', { socketId: socket.id });

        sendPermissionDeniedResponse(socket);
        return;
      }

      next();
    };
  }

  private async checkPermission(_props: CheckPermissionProps): Promise<boolean> {
    // Add your permission logic here (e.g. check socket roles, topic ownership, JWT claims, etc.)
    return true;
  }
}

type CheckPermissionProps = {
  socket: WebSocket;
  payload: TopicPayload;
  userPermissions: Record<string, any>;
};
