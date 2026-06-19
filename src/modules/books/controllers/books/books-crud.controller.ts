import { API_PATHS, StatusCodes } from '@src/common/constants';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { joiQueryMiddleware } from '@src/middlewares/joi-query.middleware';
import { createBookSchema } from './dto/createBook.dto';
import { getBooksQuerySchema } from './dto/getBooksQuery.dto';
import { updateBookSchema } from './dto/updatedBook.dto';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { BooksService } from '../../services/books/books.service';
import type { GetBooksParsedQuery } from '../../types';

export class BooksCrudController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly booksService: BooksService,
  ) {}

  registerRoutes() {
    this.getBooks();
    this.getBookById();
    this.createBook();
    this.updateBook();
    this.deleteBook();
  }

  private createBook() {
    this.app.post(API_PATHS.books, joiBodyMiddleware(createBookSchema), async (req: Request, res: Response) => {
      const { body } = req;

      this.app.logger.info(`POST ${API_PATHS.books} - creating new book`);

      const newBook = await this.booksService.createBook(body);

      res.status(StatusCodes.CREATED).json(newBook);
    });
  }

  private getBooks() {
    this.app.get(API_PATHS.books, joiQueryMiddleware(getBooksQuerySchema), async (req: Request, res: Response) => {
      const queryParsed = req.queryParsed as GetBooksParsedQuery;

      this.app.logger.info(
        `GET ${API_PATHS.books} - fetching books (page=${queryParsed.page}, limit=${queryParsed.limit})`,
      );

      const result = await this.booksService.getBooks(queryParsed);

      res.json(result);
    });
  }

  private getBookById() {
    this.app.get(API_PATHS.bookById, async (req: Request, res: Response) => {
      const { params } = req;

      this.app.logger.info(`GET ${API_PATHS.bookById} - fetching book by ID`);

      const bookId = params.bookId!;

      const book = await this.booksService.getBookById(bookId);

      if (!book) {
        this.app.logger.error('Book not found', bookId);

        return void res.status(StatusCodes.NOT_FOUND).json({ message: 'Book not found' });
      }

      res.json(book);
    });
  }

  private updateBook() {
    this.app.patch(API_PATHS.bookById, joiBodyMiddleware(updateBookSchema), async (req: Request, res: Response) => {
      const { body, params } = req;

      this.app.logger.info(`PATCH ${API_PATHS.bookById} - updating book by ID`);

      const bookId = params.bookId!;
      const updatedBook = await this.booksService.updateBook(bookId, body);

      if (!updatedBook) {
        this.app.logger.error('Book not found', bookId);

        return void res.status(StatusCodes.NOT_FOUND).json({ message: 'Book not found' });
      }

      res.json(updatedBook);
    });
  }

  private deleteBook() {
    this.app.delete(API_PATHS.bookById, async (req: Request, res: Response) => {
      const { params } = req;

      this.app.logger.info(`DELETE ${API_PATHS.bookById} - deleting book by ID`);

      const bookId = params.bookId!;
      const deletedBook = await this.booksService.deleteBook(bookId);

      if (!deletedBook) {
        this.app.logger.error('Book not found', bookId);

        return void res.status(StatusCodes.NOT_FOUND).json({ message: 'Book not found' });
      }

      res.json({ message: 'Book deleted successfully' });
    });
  }
}
