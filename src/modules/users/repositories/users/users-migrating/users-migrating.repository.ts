import { compareUsers } from './logic/compareUsers';
import { pickReadBackend } from './logic/pickReadBackend';
import type { ILogger } from '@src/lib/logger';
import type { UsersMigrationMetricsService } from '../../../services/users-migration-metrics';
import type { DatabaseUser } from '../../../types';
import type {
  IUsersRepository,
  GetUserByIdOptions,
  GetUsersProps,
  CreateUserDto,
  UpdateUserDto,
  GetUserByEmailOptions,
} from '../types';
import type { MigrationPolicy } from './migration-policy';
import type { ReadBackend } from './types';

/**
 * Strangler-fig decorator that drives the Mongo→Postgres migration while presenting the
 * plain {@link IUsersRepository} interface to everything above it (services, cache, controllers).
 *
 * Responsibilities (and ONLY these — reconciliation and the read-flip live elsewhere):
 *  - Read routing with a sticky canary ramp ({@link pickReadBackend}).
 *  - Shadow reads: serve the authoritative store, also query the other one, meter divergence.
 *    Only for EMAIL-keyed reads — `id` is store-local so an id can't be looked up cross-store.
 *  - Dual writes: authoritative (primary = read backend) must succeed; secondary is
 *    best-effort, resolved by `email` (never by id), and its failures are metered, never thrown.
 *
 * When the migration completes, delete this class and inject the Postgres repo directly.
 */
export class MigratingUsersRepository implements IUsersRepository {
  constructor(
    private readonly mongo: IUsersRepository,
    private readonly postgres: IUsersRepository,
    private readonly policy: MigrationPolicy,
    private readonly metrics: UsersMigrationMetricsService,
    private readonly logger: ILogger,
  ) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async getUserById(userId: string, options?: GetUserByIdOptions): Promise<DatabaseUser | null> {
    // No shadow-compare here: ids are store-local, so the "other" store can't be
    // queried for the same record by this id. Confidence for id-lookups is inherited
    // from the email-keyed shadow reads + the reconciliation job.
    const backend = this.pickBackend(userId);
    const user = await this.repo(backend).getUserById(userId, options);

    return user;
  }

  async getUserByEmail(email: string, options?: GetUserByEmailOptions): Promise<DatabaseUser | null> {
    const backend = this.pickBackend(email);
    const authoritative = await this.repo(backend).getUserByEmail(email, options);

    if (this.policy.isShadowReadEnabled()) {
      await this.shadowCompareByEmail({ email, authoritative, authoritativeBackend: backend, options });
    }

    return authoritative;
  }

  async getUsers(props?: GetUsersProps): Promise<Array<DatabaseUser>> {
    // No per-request key → serves the base read backend (canary applies to keyed reads).
    // Full-collection comparison is the reconciliation job's responsibility, not the hot path.
    const backend = this.pickBackend(undefined);
    const users = await this.repo(backend).getUsers(props);

    return users;
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  async createUser(body: CreateUserDto): Promise<DatabaseUser> {
    const writeMode = this.policy.getWriteMode();

    if (writeMode !== 'dual') {
      const created = await this.repo(writeMode).createUser(body);
      return created;
    }

    const { primary, secondary } = this.dualWriteRepos();

    const createdUser = await primary.createUser(body);

    // Secondary mints its own id; correlation is by email, so `body` replays cleanly.
    await this.executeSecondaryWrite('createUser', async () => {
      await secondary.createUser(body);
    });

    return createdUser;
  }

  async updateUserById(userId: string, body: UpdateUserDto): Promise<DatabaseUser> {
    const writeMode = this.policy.getWriteMode();

    if (writeMode !== 'dual') {
      const updated = await this.repo(writeMode).updateUserById(userId, body);
      return updated;
    }

    const { primary, secondary } = this.dualWriteRepos();

    const updatedUser = await primary.updateUserById(userId, body);

    // The secondary's id differs — resolve the same logical user by email first.
    await this.executeSecondaryWrite('updateUserById', async () => {
      const secondaryUser = await secondary.getUserByEmail(updatedUser.email);
      if (secondaryUser) {
        await secondary.updateUserById(secondaryUser.id, body);
      }
    });

    return updatedUser;
  }

  async deleteUserById(userId: string): Promise<boolean> {
    const writeMode = this.policy.getWriteMode();

    if (writeMode !== 'dual') {
      const deleted = await this.repo(writeMode).deleteUserById(userId);
      return deleted;
    }

    const { primary, secondary } = this.dualWriteRepos();

    // Capture the email BEFORE deleting so we can locate the secondary record.
    const primaryUser = await primary.getUserById(userId);
    const wasDeleted = await primary.deleteUserById(userId);

    if (primaryUser) {
      await this.executeSecondaryWrite('deleteUserById', async () => {
        const secondaryUser = await secondary.getUserByEmail(primaryUser.email);
        if (secondaryUser) {
          await secondary.deleteUserById(secondaryUser.id);
        }
      });
    }

    return wasDeleted;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private repo(backend: ReadBackend): IUsersRepository {
    const chosen = backend === 'postgres' ? this.postgres : this.mongo;
    return chosen;
  }

  private pickBackend(key: string | undefined): ReadBackend {
    const backend = pickReadBackend({
      readBackend: this.policy.getReadBackend(),
      canaryPercent: this.policy.getReadCanaryPercent(),
      key,
    });
    return backend;
  }

  private dualWriteRepos(): { primary: IUsersRepository; secondary: IUsersRepository } {
    const primaryBackend = this.policy.getPrimaryWriteBackend();
    const secondaryBackend: ReadBackend = primaryBackend === 'postgres' ? 'mongo' : 'postgres';

    const repos = { primary: this.repo(primaryBackend), secondary: this.repo(secondaryBackend) };

    return repos;
  }

  private async shadowCompareByEmail(props: {
    email: string;
    authoritative: DatabaseUser | null;
    authoritativeBackend: ReadBackend;
    options?: GetUserByEmailOptions;
  }): Promise<void> {
    const { email, authoritative, authoritativeBackend, options } = props;

    const shadowBackend: ReadBackend = authoritativeBackend === 'postgres' ? 'mongo' : 'postgres';

    try {
      const shadowUser = await this.repo(shadowBackend).getUserByEmail(email, options);
      const comparison = compareUsers({ left: authoritative, right: shadowUser });

      if (!comparison.isEqual) {
        this.metrics.onDivergence({ operation: 'getUserByEmail' });
        this.logger.warn('users-migration: shadow-read divergence', {
          email,
          authoritativeBackend,
          shadowBackend,
          differingFields: comparison.differingFields,
        });
      }
    } catch (error) {
      // A shadow read must NEVER affect the served response — swallow, but record it.
      this.metrics.onDualWriteFailure({ operation: 'shadowRead' });
      this.logger.error('users-migration: shadow-read failed', { email, shadowBackend, error });
    }
  }

  private async executeSecondaryWrite(operation: string, run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (error) {
      // Best-effort by design: the authoritative write already succeeded, so we must
      // not fail the request. The counter + reconciliation job heal the resulting drift.
      this.metrics.onDualWriteFailure({ operation });
      this.logger.error('users-migration: secondary write failed', { operation, error });
    }
  }
}
