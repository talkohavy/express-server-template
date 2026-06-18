import { BUILT_IN_WEBSOCKET_EVENTS } from '@src/core/services/topic-subscriber';
import type { WsConnectionContext, IConnectionPipeline } from '../../../types';
import type { PingPongService } from '../../ping-pong';

export class AttachPongHandlerToSocketPipeline implements IConnectionPipeline {
  constructor(private readonly pingPongService: PingPongService) {}

  handleConnection(props: WsConnectionContext) {
    const { socket } = props;

    socket.on(BUILT_IN_WEBSOCKET_EVENTS.Pong, () => {
      this.pingPongService.markSocketAlive(socket);
    });

    this.pingPongService.registerSocketToPingPong(socket);
  }
}
