import { BUILT_IN_WEBSOCKET_EVENTS, SOCKET_EVENTS } from '../logic/constants';
import type { Socket, Server as SocketIOServer } from 'socket.io';
import type { LoggerService } from '@src/core/services/logger';
import type { SocketType } from '../types';
import type { SendMessageToTopicPayload } from './interfaces/publish-message-to-topic.event-handler.interface';

export class PublishMessageToTopicEventHandler {
  constructor(
    private readonly socketIOApp: SocketIOServer,
    private readonly logger: LoggerService,
  ) {}

  registerEventHandlers(): void {
    this.socketIOApp.on(BUILT_IN_WEBSOCKET_EVENTS.Connection, (socket: Socket) => {
      this.handleSendMessageToTopicEvent(socket);
    });
  }

  private async handleSendMessageToTopicEvent(socket: SocketType) {
    socket.on(SOCKET_EVENTS.SendMessageToTopic, (data) => {
      this.sendMessageToTopic(socket, data);
    });
  }

  private async sendMessageToTopic(socket: SocketType, payload: SendMessageToTopicPayload) {
    const { topic, data } = payload ?? {};

    if (!topic) {
      this.logger.error('Topic is required');
      socket.emit(SOCKET_EVENTS.Message, { error: 'Topic is required' });
      return;
    }

    this.logger.debug('[registerToTopic] user registered to topic', { topic });

    this.socketIOApp.to(topic).emit(SOCKET_EVENTS.SendMessageToTopic, data);
  }
}
