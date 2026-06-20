import { randomUUID } from 'node:crypto';
import type { WsConnectionContext, IConnectionPipeline } from '../../../types';

export class AttachSocketIdToConnectionPipeline implements IConnectionPipeline {
  handleConnection(props: WsConnectionContext, next: () => void): void {
    const { socket } = props;

    socket.id = randomUUID();

    next();
  }
}
