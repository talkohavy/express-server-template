import type { WsConnectionContext, IConnectionPipeline } from '../../../types';

export class AttachDataToSocketPipeline implements IConnectionPipeline {
  handleConnection(props: WsConnectionContext, next: () => void): void {
    const { socket } = props;

    socket.data = {
      user: null,
    };

    next();
  }
}
