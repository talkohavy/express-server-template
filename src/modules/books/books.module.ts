import { BooksCrudController } from './controllers/books';
import { BooksMiddleware } from './middleware/books.middleware';
import { BooksService } from './services/books';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

export class BooksModule implements ModuleFactory {
  private booksService!: BooksService;

  constructor(private readonly app: Application) {}

  async init(): Promise<void> {
    this.booksService = new BooksService();

    // Only attach routes if running as a standalone micro-service
    if (process.env.IS_STANDALONE_MICRO_SERVICES) {
      this.attachControllers();
    }
  }

  private attachControllers(): void {
    const booksMiddleware = new BooksMiddleware(this.app);
    const booksCrudController = new BooksCrudController(this.app, this.booksService);

    booksMiddleware.use();
    booksCrudController.registerRoutes();
  }

  get services() {
    return {
      booksService: this.booksService,
    };
  }
}
