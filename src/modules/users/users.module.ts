import { UserUtilitiesController } from './controllers/user-utilities';
import { UsersCrudController } from './controllers/users-crud';
import { UsersMiddleware } from './middleware/users.middleware';
import { UsersCachedRepository, UsersPostgresRepository, type IUsersRepository } from './repositories/users';
import { FieldScreeningService } from './services/field-screening';
import { UserUtilitiesService } from './services/user-utilities';
import { UsersCrudService } from './services/users-crud';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';
// import { UsersMongoRepository } from './repositories/users';

export class UsersModule implements ModuleFactory {
  private usersRepository!: IUsersRepository;
  private usersCrudService!: UsersCrudService;
  private userUtilitiesService!: UserUtilitiesService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    // Initialize repositories
    // this.usersRepository = new UsersMongoRepository(this.app.mongo);
    const usersPostgresRepository = new UsersPostgresRepository(this.app.pg);
    this.usersRepository = new UsersCachedRepository(usersPostgresRepository, this.app.redis.pub);

    // Initialize helper services
    const fieldScreeningService = new FieldScreeningService(['hashed_password'], ['nickname']);

    // Initialize main services
    this.usersCrudService = new UsersCrudService(this.usersRepository);
    this.userUtilitiesService = new UserUtilitiesService(this.usersRepository, fieldScreeningService);

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

  get services() {
    return {
      usersCrudService: this.usersCrudService,
      userUtilitiesService: this.userUtilitiesService,
    };
  }
}
