import type { WsConnectionContext, IConnectionPipeline } from '../../../types';

const ALLOWED_CONNECTION_URLS = ['/', '/api/ws/v1', '/api/ws/v2'];

export class ValidateConnectionUrlPipeline implements IConnectionPipeline {
  handleConnection(props: WsConnectionContext, next: () => void): void {
    const { socket, request } = props;

    if (!ALLOWED_CONNECTION_URLS.includes(request.url ?? '')) {
      socket.close(1008, 'Invalid connection URL');
      return;
    }

    next();
  }
}
