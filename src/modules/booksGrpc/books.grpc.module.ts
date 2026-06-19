import { BooksServiceService } from '../backend/proto/generated/backend/books/v1/books';
import { BooksService } from '../books/services/books';
import { BooksGrpcController } from './controllers/books.grpc.controller';
import type { Server } from '@grpc/grpc-js';
import type { ModuleFactory } from '@src/lib/lucky-server';

export class BooksGrpcModule implements ModuleFactory {
  private booksService!: BooksService;

  constructor(private readonly app: Server) {}

  async init(): Promise<void> {
    this.booksService = new BooksService();

    // Only attach routes if running as a standalone micro-service
    if (process.env.IS_STANDALONE_MICRO_SERVICES) {
      this.attachControllers();
    }
  }

  private attachControllers() {
    const { logger } = this.app;

    const booksGrpcController = new BooksGrpcController(this.booksService, logger);

    this.app.addService(BooksServiceService, booksGrpcController as any);
  }

  get services() {
    return {
      booksService: this.booksService,
    };
  }
}
