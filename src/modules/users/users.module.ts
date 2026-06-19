import { nonSensitiveFields, sensitiveFields } from '../../databases/mongo/models/user/user.schema.template';
import { UserUtilitiesController } from './controllers/user-utilities';
import { UsersCrudController } from './controllers/users-crud';
import { UsersMiddleware } from './middleware/users.middleware';
import { UsersCachedRepository, UsersPostgresRepository, type IUsersRepository } from './repositories/users';
import { FieldScreeningService } from './services/field-screening';
import { UserUtilitiesService } from './services/user-utilities';
import { UsersBloomFilterService } from './services/users-bloom-filter';
import { UsersCacheMetricsService } from './services/users-cache-metrics';
import { UsersCrudService } from './services/users-crud';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';
// import { UsersMongoRepository } from './repositories/users';

export class UsersModule implements ModuleFactory {
  private usersDBRepository!: IUsersRepository;
  private usersCachedRepository!: IUsersRepository;
  private usersCrudService!: UsersCrudService;
  private userUtilitiesService!: UserUtilitiesService;
  private fieldScreeningService!: FieldScreeningService;
  private usersCacheMetricsService!: UsersCacheMetricsService;
  private usersBloomFilterService!: UsersBloomFilterService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    const { metrics, redis, pg } = this.app;

    // this.usersRepository = new UsersMongoRepository();
    this.usersDBRepository = new UsersPostgresRepository(pg);

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

  private attachControllers(): void {
    const usersMiddleware = new UsersMiddleware(this.app);

    const userUtilitiesController = new UserUtilitiesController(this.app, this.userUtilitiesService);
    const usersCrudController = new UsersCrudController(this.app, this.usersCrudService);

    usersMiddleware.use();

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
    };
  }
}
