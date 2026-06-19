import { ChannelCredentials } from '@grpc/grpc-js';
import { ConfigKeys, type ServicesConfig } from '@src/plugins/config-service';
import { BooksDirectAdapter, BooksGrpcAdapter, BooksHttpAdapter, BooksController, type IBooksAdapter } from './books';
import { DragonsController, DragonsDirectAdapter, DragonsHttpAdapter, type IDragonsAdapter } from './dragons';
import {
  FileUploadDirectAdapter,
  FileUploadHttpAdapter,
  FileUploadController,
  type IFileUploadAdapter,
} from './file-upload';
import { HttpClient } from './logic/http-client';
import { AuthDirectAdapter, AuthHttpAdapter, LoginController, type IAuthAdapter } from './login';
import { BooksServiceClient } from './proto/generated/backend/books/v1/books';
import {
  UsersDirectAdapter,
  UsersHttpAdapter,
  UsersCrudController,
  UserUtilitiesController,
  type IUsersAdapter,
} from './users';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

/**
 * BackendModule serves as the BFF (Backend-For-Frontend).
 * It owns ALL public-facing routes and orchestrates communication with domain modules.
 *
 * In monolith mode: Uses direct adapters that call module services directly.
 * In micro-services mode: Uses HTTP adapters that make HTTP calls to other services.
 */
export class BackendModule implements ModuleFactory {
  private usersAdapter!: IUsersAdapter;
  private authAdapter!: IAuthAdapter;
  private booksAdapter!: IBooksAdapter;
  private dragonsAdapter!: IDragonsAdapter;
  private fileUploadAdapter!: IFileUploadAdapter;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    this.initializeAdapters();
    this.attachControllers();
  }

  private initializeAdapters(): void {
    const microServicesProtocol = process.env.MICRO_SERVICES_PROTOCOL;

    if (microServicesProtocol === 'direct') {
      return void this.initializeDirectAdapters();
    }

    if (microServicesProtocol === 'http') {
      return void this.initializeHttpAdapters();
    }

    if (microServicesProtocol === 'grpc') {
      return void this.initializeGrpcAdapters();
    }

    throw new Error(`Invalid micro-services protocol: ${microServicesProtocol}`);
  }

  private attachControllers(): void {
    // BackendModule ALWAYS attaches public routes (it's the BFF)
    const loginController = new LoginController(this.app, this.authAdapter, this.usersAdapter);
    const usersCrudController = new UsersCrudController(this.app, this.usersAdapter);
    const userUtilitiesController = new UserUtilitiesController(this.app, this.usersAdapter, this.authAdapter);
    const booksController = new BooksController(this.app, this.booksAdapter);
    const dragonsController = new DragonsController(this.app, this.dragonsAdapter);
    const fileUploadController = new FileUploadController(this.app, this.fileUploadAdapter);

    loginController.registerRoutes();
    usersCrudController.registerRoutes();
    userUtilitiesController.registerRoutes();
    booksController.registerRoutes();
    dragonsController.registerRoutes();
    fileUploadController.registerRoutes();
  }

  private initializeDirectAdapters() {
    // Direct adapters wrapping module services (monolith mode)
    const { usersCrudService, userUtilitiesService } = this.app.modules.UsersModule.services;
    const { passwordManagementService, tokenGenerationService, tokenVerificationService } =
      this.app.modules.AuthenticationModule.services;
    const { booksService } = this.app.modules.BooksModule.services;
    const { dragonsService } = this.app.modules.DragonsModule.services;
    const { fileUploadService } = this.app.modules.FileUploadModule.services;

    this.usersAdapter = new UsersDirectAdapter(usersCrudService, userUtilitiesService);
    this.authAdapter = new AuthDirectAdapter(
      passwordManagementService,
      tokenGenerationService,
      tokenVerificationService,
    );
    this.booksAdapter = new BooksDirectAdapter(booksService);
    this.dragonsAdapter = new DragonsDirectAdapter(dragonsService);
    this.fileUploadAdapter = new FileUploadDirectAdapter(fileUploadService);
  }

  private initializeHttpAdapters() {
    const { configService } = this.app;

    const httpClient = new HttpClient(configService);
    this.usersAdapter = new UsersHttpAdapter(httpClient);
    this.authAdapter = new AuthHttpAdapter(httpClient);
    this.booksAdapter = new BooksHttpAdapter(httpClient);
    this.dragonsAdapter = new DragonsHttpAdapter(httpClient);
    this.fileUploadAdapter = new FileUploadHttpAdapter(httpClient);
  }

  /**
   * NOTE: gRPC base URLs must NOT include the "http://" protocol. Only the host & port.
   */
  private initializeGrpcAdapters() {
    const { books } = this.app.configService.get<ServicesConfig>(ConfigKeys.Services);

    if (books.baseUrl == null) {
      throw new Error('booksGrpcUrl is required when booksTransport is grpc');
    }

    const grpcBooksClient = new BooksServiceClient(books.baseUrl, ChannelCredentials.createInsecure());

    this.booksAdapter = new BooksGrpcAdapter(grpcBooksClient);
  }
}
