import type { PasswordManagementService } from '../../../authentication/services/password-management';
import type { SessionsService } from '../../../authentication/services/sessions';
import type { TokenVerificationService } from '../../../authentication/services/token-verification';
import type { CreateTokensProps, IAuthAdapter, Tokens, DecodedToken } from './auth.adapter.interface';

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

  async verifyToken(token: string): Promise<DecodedToken> {
    return this.tokenVerificationService.verifyToken(token);
  }
}
