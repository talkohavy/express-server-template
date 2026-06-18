import { ResponseTypes } from '../logic/constants';
import { sendResponse } from '../logic/utils/sendResponse';
import type { WebSocket } from 'ws';
import type { ClientMessage, TopicMessage } from '@src/common/types';
import type { LoggerService } from '@src/core/services/logger';
import type { MiddlewareFactory } from '@src/lib/lucky-server';

export class ValidateTopicMessageMiddleware implements MiddlewareFactory {
  constructor(private readonly logger: LoggerService) {}

  use() {
    return async (socket: WebSocket, message: ClientMessage, next: () => void) => {
      const isValid = this.isValidTopicMessage(message);

      if (!isValid) {
        this.logger.debug('Send action: invalid message data', { message });

        return void sendResponse({ socket, type: ResponseTypes.ValidationError, message: 'data must be an object' });
      }

      next();
    };
  }

  private isValidTopicMessage(message: ClientMessage): message is TopicMessage {
    const { topic, data } = message.payload ?? {};

    const isValidTopic = Boolean(topic) && typeof topic === 'string';
    const hasValidData = Boolean(data) && typeof data === 'object' && !Array.isArray(data);

    return isValidTopic && hasValidData;
  }
}
