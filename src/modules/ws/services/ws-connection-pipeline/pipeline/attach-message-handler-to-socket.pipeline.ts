import { BUILT_IN_WEBSOCKET_EVENTS } from '@src/core/services/topic-subscriber';
import type { WsConnectionContext, IConnectionPipeline } from '../../../types';
import type { MessageDispatcherByEventService } from '../../message-dispatcher-by-event';

export class AttachMessageHandlerToSocketPipeline implements IConnectionPipeline {
  constructor(private readonly messageDispatcherByEventService: MessageDispatcherByEventService) {}

  handleConnection(props: WsConnectionContext, next: () => void): void {
    const { socket } = props;

    socket.on(BUILT_IN_WEBSOCKET_EVENTS.Message, (data: Buffer) => {
      this.messageDispatcherByEventService.dispatchMessage(socket, data);
    });

    next();
  }
}
