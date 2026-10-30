import type { PasswordManagementService } from '../../../authentication/services/password-management';
import type { SessionsService } from '../../../authentication/services/sessions';
import type { TokenVerificationService } from '../../../authentication/services/token-verification';
import type {
  ConsumedRefreshToken,
  CreateTokensProps,
  IAuthAdapter,
  RevokedSession,
  Tokens,
  DecodedToken,
} from './auth.adapter.interface';

export class AuthDirectAdapter implements IAuthAdapter {
  constructor(
    private readonly passwordManagementService: PasswordManagementService,
    private readonly sessionsService: SessionsService,
    private readonly tokenVerificationService: TokenVerificationService,
  ) {}

  async generateHashedPassword(rawPassword: string, salt: string): Promise<string> {
    return this.passwordManagementService.generateHashedPassword({ rawPassword, salt });
  }

  async getIsPasswordValid(saltAndHashedPassword: string, rawPassword: string): Promise<boolean> {
    return this.passwordManagementService.getIsPasswordValid(saltAndHashedPassword, rawPassword);
  }

  async createTokens(props: CreateTokensProps): Promise<Tokens> {
    return this.sessionsService.createTokens(props);
  }

  async consumeRefreshToken(refreshToken: string): Promise<ConsumedRefreshToken> {
    return this.sessionsService.consumeRefreshToken(refreshToken);
  }

  async revokeSession(refreshToken: string): Promise<RevokedSession | null> {
    return this.sessionsService.revokeSession(refreshToken);
  }

  async verifyToken(token: string): Promise<DecodedToken> {
    return this.tokenVerificationService.verifyToken(token);
  }
}
