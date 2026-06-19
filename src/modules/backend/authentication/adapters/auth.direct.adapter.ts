import type { PasswordManagementService } from '../../../authentication/services/password-management';
import type { TokenGenerationService } from '../../../authentication/services/token-generation';
import type { TokenVerificationService } from '../../../authentication/services/token-verification';
import type { IAuthAdapter, Tokens, DecodedToken } from './auth.adapter.interface';

export class AuthDirectAdapter implements IAuthAdapter {
  constructor(
    private readonly passwordManagementService: PasswordManagementService,
    private readonly tokenGenerationService: TokenGenerationService,
    private readonly tokenVerificationService: TokenVerificationService,
  ) {}

  async generateHashedPassword(rawPassword: string, salt: string): Promise<string> {
    return this.passwordManagementService.generateHashedPassword({ rawPassword, salt });
  }

  async getIsPasswordValid(saltAndHashedPassword: string, rawPassword: string): Promise<boolean> {
    return this.passwordManagementService.getIsPasswordValid(saltAndHashedPassword, rawPassword);
  }

  async createTokens(userId: string, role: string): Promise<Tokens> {
    return this.tokenGenerationService.createTokens({ userId, role });
  }

  async verifyToken(token: string): Promise<DecodedToken> {
    return this.tokenVerificationService.verifyToken(token);
  }
}
