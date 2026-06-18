import { ResponseTypes } from '../logic/constants';
import { sendResponse } from '../logic/utils/sendResponse';
import type { WebSocket } from 'ws';
import type { ClientMessage } from '@src/common/types';
import type { LoggerService } from '@src/core/services/logger';
import type { MiddlewareFactory } from '@src/lib/lucky-server';
import type { TopicRegistrationMessage } from '../controllers/topic-registration/types';

export class ValidateTopicNameMiddleware implements MiddlewareFactory {
  constructor(private readonly logger: LoggerService) {}

  use() {
    return async (socket: WebSocket, message: ClientMessage, next: () => void) => {
      const isValid = this.isValidTopicName(message);

      if (!isValid) {
        this.logger.debug('Topic is required', { message });

        return void sendResponse({ socket, type: ResponseTypes.ValidationError, message: 'Topic is required' });
      }

      next();
    };
  }

  private isValidTopicName(message: ClientMessage): message is TopicRegistrationMessage {
    const { topic } = message.payload ?? {};

    const isValidTopic = Boolean(topic) && typeof topic === 'string';

    return isValidTopic;
  }
}
