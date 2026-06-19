import type { ControllerFactory } from '@src/lib/lucky-server';
import type { PasswordManagementController } from '../password-management/password-management.controller';
import type { SessionManagementController } from '../session-management/session-management.controller';
import type { TokenGenerationController } from '../token-generation/token-generation.controller';
import type { TokenVerificationController } from '../token-verification/token-verification.controller';

export class AuthenticationController implements ControllerFactory {
  constructor(
    private readonly passwordManagementController: PasswordManagementController,
    private readonly tokenGenerationController: TokenGenerationController,
    private readonly tokenVerificationController: TokenVerificationController,
    private readonly sessionManagementController: SessionManagementController,
  ) {}

  registerRoutes() {
    this.passwordManagementController.registerRoutes();
    this.tokenGenerationController.registerRoutes();
    this.tokenVerificationController.registerRoutes();
    this.sessionManagementController.registerRoutes();
  }
}
