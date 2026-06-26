import { parseCookies } from '@src/common/utils/cookie-parser';
import type { TokenVerificationService } from '../../../../authentication/services/token-verification';
import type { WsConnectionContext, IConnectionPipeline } from '../../../types';

export class AuthenticateUserPipeline implements IConnectionPipeline {
  constructor(private readonly tokenVerificationService: TokenVerificationService) {}

  async handleConnection(props: WsConnectionContext, next: () => void): Promise<void> {
    const { socket, request } = props;

    const cookies = parseCookies(request.headers.cookie);
    const accessToken = cookies.access_token;

    if (!accessToken) {
      socket.close(1008, 'Unauthorized');
      return;
    }

    const decodedToken = await this.tokenVerificationService.verifyToken(accessToken);

    if (!decodedToken) {
      socket.close(1008, 'Unauthorized');
      return;
    }

    socket.data.user = decodedToken;

    next();
  }
}
