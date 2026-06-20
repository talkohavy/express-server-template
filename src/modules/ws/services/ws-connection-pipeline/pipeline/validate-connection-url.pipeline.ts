import type { WsConnectionContext, IConnectionPipeline } from '../../../types';

const ALLOWED_CONNECTION_URLS = [
  'https://example.com',
  'https://example.com/api/ws',
  'https://example.com/api/ws/v1',
  'https://example.com/api/ws/v2',
  'https://example.com/api/ws/v3',
  'https://example.com/api/ws/v4',
  'https://example.com/api/ws/v5',
];

export class ValidateConnectionUrlPipeline implements IConnectionPipeline {
  async handleConnection(props: WsConnectionContext): Promise<void> {
    const { socket, request } = props;

    if (!ALLOWED_CONNECTION_URLS.includes(request.url ?? '')) {
      socket.close(1008, 'Invalid connection URL');
    }
  }
}
