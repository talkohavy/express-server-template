import { PasswordManagementService } from './password-management.service';

describe('PasswordManagementService', () => {
  let service: PasswordManagementService;

  beforeEach(() => {
    service = new PasswordManagementService();
  });

  describe('generateHashedPassword', () => {
    it('should generate a hashed password from raw password and salt', async () => {
      const rawPassword = 'mySecurePassword123';
      const salt = 'randomSalt123';

      const hashedPassword = await service.generateHashedPassword({ rawPassword, salt });

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for different salts', async () => {
      const rawPassword = 'mySecurePassword123';
      const salt1 = 'salt1';
      const salt2 = 'salt2';

      const hash1 = await service.generateHashedPassword({ rawPassword, salt: salt1 });
      const hash2 = await service.generateHashedPassword({ rawPassword, salt: salt2 });

      expect(hash1).not.toBe(hash2);
    });

    it('should generate the same hash for the same password and salt', async () => {
      const rawPassword = 'mySecurePassword123';
      const salt = 'consistentSalt';

      const hash1 = await service.generateHashedPassword({ rawPassword, salt });
      const hash2 = await service.generateHashedPassword({ rawPassword, salt });

      expect(hash1).toBe(hash2);
    });
  });

  describe('getIsPasswordValid', () => {
    it('should return true when password matches', async () => {
      const rawPassword = 'mySecurePassword123';
      const salt = 'testSalt';
      const hashedPassword = await service.generateHashedPassword({ rawPassword, salt });
      const saltAndHashedPassword = `${salt}:${hashedPassword}`;

      const isValid = await service.getIsPasswordValid(saltAndHashedPassword, rawPassword);

      expect(isValid).toBe(true);
    });

    it('should return false when password does not match', async () => {
      const correctPassword = 'correctPassword123';
      const wrongPassword = 'wrongPassword456';
      const salt = 'testSalt';
      const hashedPassword = await service.generateHashedPassword({ rawPassword: correctPassword, salt });
      const saltAndHashedPassword = `${salt}:${hashedPassword}`;

      const isValid = await service.getIsPasswordValid(saltAndHashedPassword, wrongPassword);

      expect(isValid).toBe(false);
    });
  });
});
