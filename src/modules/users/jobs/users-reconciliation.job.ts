import { compareUsers } from '../repositories/users/users-migrating';
import type { ILogger } from '@src/lib/logger';
import type { IUsersRepository, MigrationPolicy } from '../repositories/users';
import type { UsersMigrationMetricsService } from '../services/users-migration-metrics';
import type { DatabaseUser } from '../types';

export type ReconciliationReport = {
  totalPrimary: number;
  totalSecondary: number;
  /** Emails present in the primary store but missing from the secondary. */
  missingInSecondary: string[];
  /** Emails present in the secondary but not in the primary (usually stale/orphaned). */
  orphanInSecondary: string[];
  /** Emails present in both stores whose comparable fields disagree. */
  divergent: string[];
};

/**
 * Off-request-path safety net for the dual-write phase.
 *
 * Dual writes have no distributed transaction, so a crash between the primary and
 * secondary write leaves drift. This job full-scans both stores, joins by EMAIL
 * (never id — ids are store-local), and reports what disagrees. Run it on a schedule;
 * only trust the read-flip once its `divergent`/`missing` counts sit at zero.
 *
 * This is a STUB in one respect: it reports drift but does not auto-heal it. Wiring a
 * scheduler and a heal step (re-copy primary→secondary for each reported email) is the
 * natural next iteration; kept report-only here so it can't cause damage unattended.
 */
export class UsersReconciliationJob {
  constructor(
    private readonly mongo: IUsersRepository,
    private readonly postgres: IUsersRepository,
    private readonly policy: MigrationPolicy,
    private readonly metrics: UsersMigrationMetricsService,
    private readonly logger: ILogger,
  ) {}

  async run(): Promise<ReconciliationReport> {
    // Resolve primary/secondary from the CURRENT policy so the report never inverts
    // its labels relative to the actual write direction, even after a runtime flip.
    const primaryBackend = this.policy.getPrimaryWriteBackend();
    const primary = primaryBackend === 'postgres' ? this.postgres : this.mongo;
    const secondary = primaryBackend === 'postgres' ? this.mongo : this.postgres;

    const [primaryUsers, secondaryUsers] = await Promise.all([primary.getUsers(), secondary.getUsers()]);

    const secondaryByEmail = UsersReconciliationJob.indexByEmail(secondaryUsers);
    const primaryByEmail = UsersReconciliationJob.indexByEmail(primaryUsers);

    const missingInSecondary: string[] = [];
    const divergent: string[] = [];

    primaryByEmail.forEach((primaryUser, email) => {
      const secondaryUser = secondaryByEmail.get(email);

      if (!secondaryUser) {
        missingInSecondary.push(email);
        return;
      }

      const comparison = compareUsers({ left: primaryUser, right: secondaryUser });
      if (!comparison.isEqual) {
        divergent.push(email);
        this.metrics.onDivergence({ operation: 'reconciliation' });
      }
    });

    const orphanInSecondary: string[] = [];
    secondaryByEmail.forEach((_secondaryUser, email) => {
      if (!primaryByEmail.has(email)) {
        orphanInSecondary.push(email);
      }
    });

    const report: ReconciliationReport = {
      totalPrimary: primaryUsers.length,
      totalSecondary: secondaryUsers.length,
      missingInSecondary,
      orphanInSecondary,
      divergent,
    };

    this.logger.log('users-migration: reconciliation complete', report);

    return report;
  }

  private static indexByEmail(users: Array<DatabaseUser>): Map<string, DatabaseUser> {
    const byEmail = new Map<string, DatabaseUser>();

    users.forEach((user) => {
      byEmail.set(user.email, user);
    });

    return byEmail;
  }
}
