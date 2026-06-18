import { ResponseTypes, SocketEvents } from '../../logic/constants';
import { sendResponse } from '../../logic/utils/sendResponse';
import { RequireTopicPermissionMiddleware } from '../../middleware/require-topic-permission.middleware';
import { ValidateTopicMessageMiddleware } from '../../middleware/validate-topic-message.middleware';
import type { WebSocket } from 'ws';
import type { TopicMessage } from '@src/common/types';
import type { LoggerService } from '@src/core/services/logger';
import type { TopicPublisherService } from '@src/core/services/topic-publisher';
import type { EventHandlerFactory } from '@src/lib/lucky-server';
import type { MessageDispatcherByEventService } from '../../services/message-dispatcher-by-event';

/**
 * Handles the "send" event: client publishes a message to a topic.
 * All subscribers of that topic (including other clients) receive the message.
 */
export class PublishToTopicController implements EventHandlerFactory {
  constructor(
    private readonly topicPublisherService: TopicPublisherService,
    private readonly messageDispatcherByEventService: MessageDispatcherByEventService,
    private readonly logger: LoggerService,
  ) {}

  attachEventHandlers(): void {
    const validateTopicMessageMiddleware = new ValidateTopicMessageMiddleware(this.logger).use();
    const requireTopicPermissionMiddleware = new RequireTopicPermissionMiddleware(this.logger).use();

    this.messageDispatcherByEventService.register({
      event: SocketEvents.Publish,
      middlewares: [validateTopicMessageMiddleware, requireTopicPermissionMiddleware],
      handler: this.handlePublishMessageToTopic.bind(this),
    });
  }

  private async handlePublishMessageToTopic(socket: WebSocket, topicMessage: TopicMessage): Promise<void> {
    const { payload } = topicMessage;
    const { topic } = payload;

    try {
      await this.topicPublisherService.publishToTopic(payload);

      this.logger.debug('Client published to topic', { topic, socketId: socket.id });

      sendResponse({ socket, type: ResponseTypes.Actions.SendSuccess });
    } catch (error) {
      this.logger.error('Send action: publish failed', { topic, error });

      sendResponse({ socket, type: ResponseTypes.Actions.SendError, message: 'Failed to publish' });
    }
  }
}
