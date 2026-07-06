import { nonSensitiveFields, sensitiveFields } from '../../databases/postgres/models/user';
import { UserUtilitiesController } from './controllers/user-utilities';
import { UsersCrudController } from './controllers/users-crud';
import { UsersReconciliationJob } from './jobs/users-reconciliation.job';
import { AttachUserFromHeadersMiddleware } from './middleware/attach-user-from-headers.middleware';
import {
  MigratingUsersRepository,
  MigrationPolicy,
  UsersCachedRepository,
  UsersMongoRepository,
  UsersPostgresRepository,
  type IUsersRepository,
  type ReadBackend,
} from './repositories/users';
import { getUserCacheKey } from './repositories/users/users-cached/logic/utils/getUserCacheKey';
import { FieldScreeningService } from './services/field-screening';
import { UserUtilitiesService } from './services/user-utilities';
import { UsersBloomFilterService } from './services/users-bloom-filter';
import { UsersCacheMetricsService } from './services/users-cache-metrics';
import { UsersCrudService } from './services/users-crud';
import { UsersMigrationMetricsService } from './services/users-migration-metrics';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

export class UsersModule implements ModuleFactory {
  private usersMongoRepository!: IUsersRepository;
  private usersPostgresRepository!: IUsersRepository;
  private migrationPolicy!: MigrationPolicy;
  private usersMigrationMetricsService!: UsersMigrationMetricsService;
  private reconciliationJob!: UsersReconciliationJob;

  private usersDBRepository!: IUsersRepository;
  private usersCachedRepository!: IUsersRepository;
  private usersCrudService!: UsersCrudService;
  private userUtilitiesService!: UserUtilitiesService;
  private fieldScreeningService!: FieldScreeningService;
  private usersCacheMetricsService!: UsersCacheMetricsService;
  private usersBloomFilterService!: UsersBloomFilterService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    const { metrics, redis, pg, logger } = this.app;

    // Both stores live side by side; the MigrationPolicy decides who is authoritative
    // at runtime, and MigratingUsersRepository routes/dual-writes accordingly. Everything
    // below usersDBRepository keeps depending on the plain IUsersRepository interface —
    // the migration is invisible to the cache, services and controllers.
    this.usersMongoRepository = new UsersMongoRepository();
    this.usersPostgresRepository = new UsersPostgresRepository(pg);
    this.migrationPolicy = new MigrationPolicy();
    this.usersMigrationMetricsService = new UsersMigrationMetricsService(
      metrics.migrationDivergences,
      metrics.dualWriteFailures,
    );

    this.usersDBRepository = new MigratingUsersRepository(
      this.usersMongoRepository,
      this.usersPostgresRepository,
      this.migrationPolicy,
      this.usersMigrationMetricsService,
      logger,
    );

    this.reconciliationJob = new UsersReconciliationJob(
      this.usersMongoRepository,
      this.usersPostgresRepository,
      this.migrationPolicy,
      this.usersMigrationMetricsService,
      logger,
    );

    this.fieldScreeningService = new FieldScreeningService(sensitiveFields, nonSensitiveFields);
    this.usersCacheMetricsService = new UsersCacheMetricsService(metrics.cacheHits, metrics.cacheMisses);
    this.usersBloomFilterService = new UsersBloomFilterService(redis.pub);

    await this.populateBloomFilter(); // <--- MUST be invoked AFTER usersDBRepository is initialized

    this.usersCachedRepository = new UsersCachedRepository(
      this.usersDBRepository,
      redis.pub,
      this.usersCacheMetricsService,
      this.usersBloomFilterService,
    );

    this.usersCrudService = new UsersCrudService(this.usersCachedRepository);
    this.userUtilitiesService = new UserUtilitiesService(this.usersCachedRepository, this.fieldScreeningService);

    // Only attach routes if running as a standalone micro-service
    if (process.env.IS_STANDALONE_MICRO_SERVICES) {
      this.attachControllers();
    }
  }

  /**
   * Moves the read source of truth to another store (the read-flip / cutover step).
   *
   * The flip itself is one flag change, but two caches keyed by the OLD store must be
   * rebuilt against the new one or reads go stale/empty:
   *  1. flush the per-user Redis cache (cached old-store values would otherwise be served), and
   *  2. reset + reseed the bloom filter from the NEW authoritative store (ids are store-local).
   *
   * Everything here is reversible: call it again with the previous backend to roll back.
   */
  async flipReadBackend(backend: ReadBackend): Promise<void> {
    this.migrationPolicy.setReadBackend(backend);

    await this.flushUserCache();
    await this.usersBloomFilterService.reset();
    await this.populateBloomFilter();

    this.app.logger.log('users-migration: read backend flipped', { backend });
  }

  private async flushUserCache(): Promise<void> {
    const matchPattern = getUserCacheKey('*');

    for await (const batch of this.app.redis.pub.scanIterator({ MATCH: matchPattern })) {
      const keys = Array.isArray(batch) ? batch : [batch];
      if (keys.length > 0) {
        await this.app.redis.pub.del(keys);
      }
    }
  }

  private attachControllers(): void {
    const attachUserFromHeadersMiddleware = new AttachUserFromHeadersMiddleware(this.app);

    const userUtilitiesController = new UserUtilitiesController(this.app, this.userUtilitiesService);
    const usersCrudController = new UsersCrudController(this.app, this.usersCrudService);

    attachUserFromHeadersMiddleware.use();

    userUtilitiesController.registerRoutes();
    usersCrudController.registerRoutes();
  }

  private async populateBloomFilter() {
    await this.usersBloomFilterService.initialize();
    const allUsers = await this.usersDBRepository.getUsers();
    const allUserIds = allUsers.map((user) => String(user.id));
    await this.usersBloomFilterService.seed(allUserIds);
  }

  get services() {
    return {
      usersCrudService: this.usersCrudService,
      userUtilitiesService: this.userUtilitiesService,
      reconciliationJob: this.reconciliationJob,
    };
  }
}
