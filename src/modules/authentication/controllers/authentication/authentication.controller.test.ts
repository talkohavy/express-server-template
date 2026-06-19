import { AuthenticationController } from './authentication/authentication.controller';
import type { PasswordManagementController } from './password-management.controller';
import type { SessionManagementController } from './session-management.controller';
import type { TokenGenerationController } from './token-generation.controller';
import type { TokenVerificationController } from './token-verification.controller';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let mockPasswordManagementController: jest.Mocked<PasswordManagementController>;
  let mockTokenGenerationController: jest.Mocked<TokenGenerationController>;
  let mockTokenVerificationController: jest.Mocked<TokenVerificationController>;
  let mockSessionManagementController: jest.Mocked<SessionManagementController>;

  beforeEach(() => {
    mockPasswordManagementController = {
      registerRoutes: jest.fn(),
    } as any;

    mockTokenGenerationController = {
      registerRoutes: jest.fn(),
    } as any;

    mockTokenVerificationController = {
      registerRoutes: jest.fn(),
    } as any;

    mockSessionManagementController = {
      registerRoutes: jest.fn(),
    } as any;

    controller = new AuthenticationController(
      mockPasswordManagementController,
      mockTokenGenerationController,
      mockTokenVerificationController,
      mockSessionManagementController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call registerRoutes on all sub-controllers', () => {
    controller.registerRoutes();

    expect(mockPasswordManagementController.registerRoutes).toHaveBeenCalledTimes(1);
    expect(mockTokenGenerationController.registerRoutes).toHaveBeenCalledTimes(1);
    expect(mockTokenVerificationController.registerRoutes).toHaveBeenCalledTimes(1);
    expect(mockSessionManagementController.registerRoutes).toHaveBeenCalledTimes(1);
  });
});
