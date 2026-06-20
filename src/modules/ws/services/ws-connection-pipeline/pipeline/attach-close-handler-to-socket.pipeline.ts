import { BUILT_IN_WEBSOCKET_EVENTS, type TopicSubscriberService } from '@src/core/services/topic-subscriber';
import type { WebSocket } from 'ws';
import type { LoggerService } from '@src/core/services/logger';
import type { WsConnectionContext, IConnectionPipeline } from '../../../types';

export class AttachCloseHandlerToSocketPipeline implements IConnectionPipeline {
  constructor(
    private readonly topicSubscriberService: TopicSubscriberService,
    private readonly logger: LoggerService,
  ) {}

  handleConnection(props: WsConnectionContext, next: () => void): void {
    const { socket } = props;

    this.attachCloseHandlerToSocket(socket);

    next();
  }

  private attachCloseHandlerToSocket(socket: WebSocket): void {
    socket.on(BUILT_IN_WEBSOCKET_EVENTS.Close, () => {
      this.topicSubscriberService.unsubscribeClientFromAllTopics(socket); // <--- redis cleanup! remove phantom keys

      this.logger.log('ws connection closed', { socketId: socket.id });
    });
  }
}
