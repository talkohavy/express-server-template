import { ResponseTypes, SocketEvents } from '../../logic/constants';
import { sendResponse } from '../../logic/utils/sendResponse';
import { ValidateTopicNameMiddleware } from '../../middleware/validate-topic-name.middleware';
import type { WebSocket } from 'ws';
import type { LoggerService } from '@src/core/services/logger';
import type { TopicSubscriberService } from '@src/core/services/topic-subscriber';
import type { EventHandlerFactory } from '@src/lib/lucky-server';
import type { MessageDispatcherByEventService } from '../../services/message-dispatcher-by-event';
import type { TopicRegistrationMessage } from './types';

export class TopicRegistrationController implements EventHandlerFactory {
  constructor(
    private readonly topicSubscriberService: TopicSubscriberService,
    private readonly messageDispatcher: MessageDispatcherByEventService,
    private readonly logger: LoggerService,
  ) {}

  attachEventHandlers(): void {
    const validateTopicNameMiddleware = new ValidateTopicNameMiddleware(this.logger).use();

    this.messageDispatcher.register({
      event: SocketEvents.Register,
      middlewares: [validateTopicNameMiddleware],
      handler: this.handleTopicRegistration.bind(this),
    });

    this.messageDispatcher.register({
      event: SocketEvents.Unregister,
      middlewares: [validateTopicNameMiddleware],
      handler: this.handleTopicUnregister.bind(this),
    });
  }

  private async handleTopicRegistration(socket: WebSocket, message: TopicRegistrationMessage): Promise<void> {
    const { topic } = message.payload;

    const isSuccess = await this.topicSubscriberService.subscribe(socket, topic);

    if (!isSuccess) {
      this.logger.debug('Client is already subscribed to topic', { topic });

      return void sendResponse({ socket, type: ResponseTypes.Actions.RegisterSuccess, message: 'Already subscribed' });
    }

    this.logger.log('Client registered to topic', { topic });

    sendResponse({ socket, type: ResponseTypes.Actions.RegisterSuccess });
  }

  private async handleTopicUnregister(socket: WebSocket, message: TopicRegistrationMessage): Promise<void> {
    const { topic } = message.payload;

    const isSuccess = await this.topicSubscriberService.unsubscribe(socket, topic);

    if (!isSuccess) {
      this.logger.debug('Client not subscribed to topic', { topic });

      return void sendResponse({ socket, type: ResponseTypes.Actions.UnregisterSuccess, message: 'Not subscribed' });
    }

    this.logger.log('Client unregistered from topic', { topic });

    sendResponse({ socket, type: ResponseTypes.Actions.UnregisterSuccess });
  }
}
