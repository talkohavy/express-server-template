import { MigratingUsersRepository } from './users-migrating.repository';
import type { ILogger } from '@src/lib/logger';
import type { UsersMigrationMetricsService } from '../../../services/users-migration-metrics';
import type { DatabaseUser } from '../../../types';
import type { IUsersRepository } from '../types';
import type { MigrationPolicy } from './migration-policy';

function buildUser(overrides: Partial<DatabaseUser> = {}): DatabaseUser {
  const user: DatabaseUser = {
    id: '1',
    email: 'a@example.com',
    nickname: 'alice',
    hashed_password: 'hash',
    date_of_birth: 0,
    role: 'user' as DatabaseUser['role'],
    ...overrides,
  };

  return user;
}

function buildRepoMock(): jest.Mocked<IUsersRepository> {
  const repo = {
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
    getUsers: jest.fn(),
    getUserById: jest.fn(),
    updateUserById: jest.fn(),
    deleteUserById: jest.fn(),
  } as unknown as jest.Mocked<IUsersRepository>;

  return repo;
}

type PolicyState = {
  readBackend: 'mongo' | 'postgres';
  writeMode: 'mongo' | 'postgres' | 'dual';
  shadowRead: boolean;
  canary: number;
};

function buildPolicyMock(state: PolicyState): MigrationPolicy {
  const policy = {
    getReadBackend: () => state.readBackend,
    getWriteMode: () => state.writeMode,
    isShadowReadEnabled: () => state.shadowRead,
    getReadCanaryPercent: () => state.canary,
    getPrimaryWriteBackend: () => state.readBackend,
  } as unknown as MigrationPolicy;

  return policy;
}

describe('MigratingUsersRepository', () => {
  let mongo: jest.Mocked<IUsersRepository>;
  let postgres: jest.Mocked<IUsersRepository>;
  let metrics: jest.Mocked<UsersMigrationMetricsService>;
  let logger: ILogger;

  beforeEach(() => {
    mongo = buildRepoMock();
    postgres = buildRepoMock();
    metrics = {
      onDivergence: jest.fn(),
      onDualWriteFailure: jest.fn(),
    } as unknown as jest.Mocked<UsersMigrationMetricsService>;
    logger = { debug: jest.fn(), log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };
  });

  it('routes id reads to the configured read backend (mongo)', async () => {
    const expectedResult = buildUser({ id: 'from-mongo' });
    mongo.getUserById.mockResolvedValue(expectedResult);
    const policy = buildPolicyMock({ readBackend: 'mongo', writeMode: 'mongo', shadowRead: false, canary: 0 });
    const repo = new MigratingUsersRepository(mongo, postgres, policy, metrics, logger);

    const actualResult = await repo.getUserById('123');

    expect(actualResult).toEqual(expectedResult);
  });

  it('does not query the shadow store for id reads (ids are store-local)', async () => {
    mongo.getUserById.mockResolvedValue(buildUser());
    const policy = buildPolicyMock({ readBackend: 'mongo', writeMode: 'mongo', shadowRead: true, canary: 0 });
    const repo = new MigratingUsersRepository(mongo, postgres, policy, metrics, logger);

    await repo.getUserById('123');

    expect(postgres.getUserById).not.toHaveBeenCalled();
  });

  it('meters a divergence when the shadow store disagrees on an email read', async () => {
    mongo.getUserByEmail.mockResolvedValue(buildUser({ nickname: 'alice' }));
    postgres.getUserByEmail.mockResolvedValue(buildUser({ nickname: 'bob' }));
    const policy = buildPolicyMock({ readBackend: 'mongo', writeMode: 'mongo', shadowRead: true, canary: 0 });
    const repo = new MigratingUsersRepository(mongo, postgres, policy, metrics, logger);

    await repo.getUserByEmail('a@example.com');

    expect(metrics.onDivergence).toHaveBeenCalledWith({ operation: 'getUserByEmail' });
  });

  it('returns the authoritative store result on an email read regardless of shadow value', async () => {
    const expectedResult = buildUser({ nickname: 'alice' });
    mongo.getUserByEmail.mockResolvedValue(expectedResult);
    postgres.getUserByEmail.mockResolvedValue(buildUser({ nickname: 'bob' }));
    const policy = buildPolicyMock({ readBackend: 'mongo', writeMode: 'mongo', shadowRead: true, canary: 0 });
    const repo = new MigratingUsersRepository(mongo, postgres, policy, metrics, logger);

    const actualResult = await repo.getUserByEmail('a@example.com');

    expect(actualResult).toEqual(expectedResult);
  });

  it('dual-write creates the user in both stores', async () => {
    const body = { email: 'a@example.com' } as any;
    mongo.createUser.mockResolvedValue(buildUser({ id: 'mongo-id' }));
    postgres.createUser.mockResolvedValue(buildUser({ id: 'pg-id' }));
    const policy = buildPolicyMock({ readBackend: 'mongo', writeMode: 'dual', shadowRead: false, canary: 0 });
    const repo = new MigratingUsersRepository(mongo, postgres, policy, metrics, logger);

    await repo.createUser(body);

    expect(postgres.createUser).toHaveBeenCalledWith(body);
  });

  it('returns the primary result on dual-write create', async () => {
    const expectedResult = buildUser({ id: 'mongo-id' });
    mongo.createUser.mockResolvedValue(expectedResult);
    postgres.createUser.mockResolvedValue(buildUser({ id: 'pg-id' }));
    const policy = buildPolicyMock({ readBackend: 'mongo', writeMode: 'dual', shadowRead: false, canary: 0 });
    const repo = new MigratingUsersRepository(mongo, postgres, policy, metrics, logger);

    const actualResult = await repo.createUser({ email: 'a@example.com' } as any);

    expect(actualResult).toEqual(expectedResult);
  });

  it('meters a dual-write failure without throwing when the secondary write fails', async () => {
    mongo.createUser.mockResolvedValue(buildUser({ id: 'mongo-id' }));
    postgres.createUser.mockRejectedValue(new Error('pg down'));
    const policy = buildPolicyMock({ readBackend: 'mongo', writeMode: 'dual', shadowRead: false, canary: 0 });
    const repo = new MigratingUsersRepository(mongo, postgres, policy, metrics, logger);

    await repo.createUser({ email: 'a@example.com' } as any);

    expect(metrics.onDualWriteFailure).toHaveBeenCalledWith({ operation: 'createUser' });
  });

  it('resolves the secondary record by email before updating it on dual-write', async () => {
    mongo.updateUserById.mockResolvedValue(buildUser({ id: 'mongo-id', email: 'a@example.com' }));
    postgres.getUserByEmail.mockResolvedValue(buildUser({ id: 'pg-id', email: 'a@example.com' }));
    postgres.updateUserById.mockResolvedValue(buildUser({ id: 'pg-id' }));
    const policy = buildPolicyMock({ readBackend: 'mongo', writeMode: 'dual', shadowRead: false, canary: 0 });
    const repo = new MigratingUsersRepository(mongo, postgres, policy, metrics, logger);

    await repo.updateUserById('mongo-id', { nickname: 'new' } as any);

    expect(postgres.updateUserById).toHaveBeenCalledWith('pg-id', { nickname: 'new' });
  });
});
