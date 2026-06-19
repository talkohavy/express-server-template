import { UserUtilitiesController } from './controllers/user-utilities/user-utilities.controller';
import { UsersCrudController } from './controllers/users-crud/users-crud.controller';
import { UsersMiddleware } from './middleware/users.middleware';
import { UsersPostgresRepository } from './repositories/users.postgres.repository';
import { FieldScreeningService } from './services/field-screening.service';
import { UserUtilitiesService } from './services/user-utilities.service';
import { UsersCrudService } from './services/users-crud.service';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';
import type { IUsersRepository } from './repositories/types';
// import { UsersMongoRepository } from './repositories/users.mongo.repository';

export class UsersModule implements ModuleFactory {
  private usersRepository!: IUsersRepository;
  private usersCrudService!: UsersCrudService;
  private userUtilitiesService!: UserUtilitiesService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    // Initialize repositories
    // this.usersRepository = new UsersMongoRepository(this.app.mongo);
    this.usersRepository = new UsersPostgresRepository(this.app.pg);

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
