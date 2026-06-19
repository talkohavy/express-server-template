import { ConfigKeys, type JwtConfig } from '@src/plugins/config-service';
import { AuthenticationController } from './controllers/authentication';
import { PasswordManagementController } from './controllers/password-management';
import { SessionManagementController } from './controllers/session-management';
import { TokenGenerationController } from './controllers/token-generation';
import { TokenVerificationController } from './controllers/token-verification';
import { AuthenticationMiddleware } from './middleware/authentication.middleware';
import { PasswordManagementService } from './services/password-management/password-management.service';
import { TokenGenerationService } from './services/token-generation/token-generation.service';
import { TokenVerificationService } from './services/token-verification/token-verification.service';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

export class AuthenticationModule implements ModuleFactory {
  private passwordManagementService!: PasswordManagementService;
  private tokenGenerationService!: TokenGenerationService;
  private tokenVerificationService!: TokenVerificationService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    const jwtConfig = this.app.configService.get<JwtConfig>(ConfigKeys.Jwt);

    if (!jwtConfig) {
      throw new Error('JWT configuration not found');
    }

    // Initialize services
    this.passwordManagementService = new PasswordManagementService();
    this.tokenGenerationService = new TokenGenerationService(jwtConfig);
    this.tokenVerificationService = new TokenVerificationService(jwtConfig);

    // Only attach routes if running as a standalone micro-service
    if (process.env.IS_STANDALONE_MICRO_SERVICES) {
      this.attachControllers();
    }
  }

  private attachControllers(): void {
    const authenticationMiddleware = new AuthenticationMiddleware(this.app);
    const passwordManagementController = new PasswordManagementController(this.app, this.passwordManagementService);
    const tokenGenerationController = new TokenGenerationController(this.app, this.tokenGenerationService);
    const tokenVerificationController = new TokenVerificationController(this.app, this.tokenVerificationService);
    const sessionManagementController = new SessionManagementController(this.app);

    const authenticationController = new AuthenticationController(
      passwordManagementController,
      tokenGenerationController,
      tokenVerificationController,
      sessionManagementController,
    );

    authenticationMiddleware.use();

    authenticationController.registerRoutes();
  }

  get services() {
    return {
      passwordManagementService: this.passwordManagementService,
      tokenGenerationService: this.tokenGenerationService,
      tokenVerificationService: this.tokenVerificationService,
    };
  }
}
