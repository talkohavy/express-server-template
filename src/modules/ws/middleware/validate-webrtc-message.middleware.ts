import { ResponseTypes } from '../logic/constants';
import { sendResponse } from '../logic/utils/sendResponse';
import type { WebSocket } from 'ws';
import type { ClientMessage } from '@src/common/types';
import type { LoggerService } from '@src/core/services/logger';
import type { MiddlewareFactory } from '@src/lib/lucky-server';
import type { WebRtcSignalingMessage } from '../controllers/webrtc-signaling/types';

export class ValidateWebRtcMessageMiddleware implements MiddlewareFactory {
  constructor(private readonly logger: LoggerService) {}

  use() {
    return async (socket: WebSocket, message: ClientMessage, next: () => void) => {
      const isValid = this.isValidWebRtcSignalingMessage(message);

      if (!isValid) {
        this.logger.debug('Invalid WebRTC signaling message', { message });

        return void sendResponse({
          socket,
          type: ResponseTypes.ValidationError,
          message: 'Invalid WebRTC signaling message',
        });
      }

      next();
    };
  }

  private isValidWebRtcSignalingMessage(message: ClientMessage): message is WebRtcSignalingMessage {
    const { type, sessionId } = message.payload ?? {};

    const isValidSessionId = Boolean(sessionId) && typeof sessionId === 'string';
    const isValidSignalType = Boolean(type) && typeof type === 'string';

    return isValidSessionId && isValidSignalType;
  }
}
