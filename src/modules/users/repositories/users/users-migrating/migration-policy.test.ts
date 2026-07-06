import { MigrationPolicy } from './migration-policy';

describe('MigrationPolicy', () => {
  it('defaults to a no-op-at-rest posture matching the current store (read+write postgres, no shadow)', () => {
    const expectedResult = { readBackend: 'postgres', writeMode: 'postgres', shadowRead: false, readCanaryPercent: 0 };

    const policy = new MigrationPolicy({});
    const actualResult = policy.getSnapshot();

    expect(actualResult).toEqual(expectedResult);
  });

  it('reads defaults from env', () => {
    const expectedResult = { readBackend: 'mongo', writeMode: 'dual', shadowRead: true, readCanaryPercent: 25 };

    const policy = new MigrationPolicy({
      USERS_MIGRATION_READ_BACKEND: 'mongo',
      USERS_MIGRATION_WRITE_MODE: 'dual',
      USERS_MIGRATION_SHADOW_READ: 'true',
      USERS_MIGRATION_READ_CANARY_PERCENT: '25',
    });
    const actualResult = policy.getSnapshot();

    expect(actualResult).toEqual(expectedResult);
  });

  it('runtime override takes precedence over the env default', () => {
    const expectedResult = 'mongo';

    const policy = new MigrationPolicy({ USERS_MIGRATION_READ_BACKEND: 'postgres' });
    policy.setReadBackend('mongo');
    const actualResult = policy.getReadBackend();

    expect(actualResult).toEqual(expectedResult);
  });

  it('primary write backend tracks the read backend', () => {
    const expectedResult = 'postgres';

    const policy = new MigrationPolicy({});
    policy.setReadBackend('postgres');
    const actualResult = policy.getPrimaryWriteBackend();

    expect(actualResult).toEqual(expectedResult);
  });

  it('clamps an out-of-range canary percent', () => {
    const expectedResult = 100;

    const policy = new MigrationPolicy({ USERS_MIGRATION_READ_CANARY_PERCENT: '999' });
    const actualResult = policy.getReadCanaryPercent();

    expect(actualResult).toEqual(expectedResult);
  });
});
