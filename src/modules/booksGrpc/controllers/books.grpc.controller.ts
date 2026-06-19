import { status, type ServiceError, type ServerUnaryCall } from '@grpc/grpc-js';
import type { LoggerService } from '@src/core/services/logger';
import type {
  CreateBookRequest,
  CreateBookResponse,
  DeleteBookRequest,
  DeleteBookResponse,
  GetBookByIdRequest,
  GetBookByIdResponse,
  GetBooksRequest,
  GetBooksResponse,
  UpdateBookRequest,
  UpdateBookResponse,
} from '@src/modules/backend/proto/generated/backend/books/v1/books';
import type { BooksService } from '../../books/services/books';

export class BooksGrpcController {
  constructor(
    private readonly booksService: BooksService,
    private readonly logger: LoggerService,
  ) {}

  async createBook(
    call: ServerUnaryCall<CreateBookRequest, CreateBookResponse>,
    callback: (error: ServiceError | null, response: CreateBookResponse | undefined) => void,
  ) {
    const request = call.request as CreateBookRequest;
    const dto = {
      name: request.name,
      author: request.author,
      publishedYear: request.publishedYear,
      genre: request.genre,
      isbn: request.isbn,
      coverImageUrl: request.coverImageUrl,
      description: request.description,
      pageCount: request.pageCount,
      rating: request.rating,
      language: request.language,
      publisher: request.publisher,
    };

    try {
      const book = await this.booksService.createBook(dto);

      const response: CreateBookResponse = { book };

      callback(null, response);
    } catch (err) {
      this.logger.error('BooksService.createBook failed', err);

      callback(err as ServiceError, null as unknown as CreateBookResponse);
    }
  }

  async getBooks(
    call: ServerUnaryCall<GetBooksRequest, GetBooksResponse>,
    callback: (error: ServiceError | null, response: GetBooksResponse | undefined) => void,
  ) {
    const request = call.request as GetBooksRequest;
    const query = { page: request.page, limit: request.limit };

    try {
      const result = await this.booksService.getBooks(query);

      const response: GetBooksResponse = {
        data: result.data,
        totalItemsCount: result.totalItemsCount,
        page: result.page,
        limit: result.limit,
        totalPagesCount: result.totalPagesCount,
        hasMore: result.hasMore,
      };

      callback(null, response);
    } catch (err) {
      this.logger.error('BooksService.getBooks failed', err);
      callback(err as ServiceError, null as unknown as GetBooksResponse);
    }
  }

  async getBookById(
    call: ServerUnaryCall<GetBookByIdRequest, GetBookByIdResponse>,
    callback: (error: ServiceError | null, response: GetBookByIdResponse | undefined) => void,
  ) {
    const request = call.request as GetBookByIdRequest;
    const bookId = request.bookId;

    try {
      const book = await this.booksService.getBookById(bookId);

      if (book === null) {
        callback({ code: status.NOT_FOUND, message: 'Book not found' } as any, null as unknown as GetBookByIdResponse);
        return;
      }

      callback(null, { book });
    } catch (err) {
      this.logger.error('BooksService.getBookById failed', err);

      callback(err as ServiceError, null as unknown as GetBookByIdResponse);
    }
  }

  async updateBook(
    call: ServerUnaryCall<UpdateBookRequest, UpdateBookResponse>,
    callback: (error: ServiceError | null, response: UpdateBookResponse | undefined) => void,
  ) {
    const request = call.request as UpdateBookRequest;
    const bookId = request.bookId;
    const dto = {
      name: request.name,
      author: request.author,
      publishedYear: request.publishedYear,
      genre: request.genre,
      isbn: request.isbn,
      coverImageUrl: request.coverImageUrl,
      description: request.description,
      pageCount: request.pageCount,
      rating: request.rating,
      language: request.language,
      publisher: request.publisher,
    };

    try {
      const book = await this.booksService.updateBook(bookId, dto);

      if (book === null) {
        callback({ code: status.NOT_FOUND, message: 'Book not found' } as any, null as unknown as UpdateBookResponse);
        return;
      }

      callback(null, { book });
    } catch (err) {
      this.logger.error('BooksService.updateBook failed', err);

      callback(err as ServiceError, null as unknown as UpdateBookResponse);
    }
  }

  async deleteBook(
    call: ServerUnaryCall<DeleteBookRequest, DeleteBookResponse>,
    callback: (error: ServiceError | null, response: DeleteBookResponse | undefined) => void,
  ) {
    const request = call.request as DeleteBookRequest;
    const bookId = request.bookId;

    try {
      const result = await this.booksService.deleteBook(bookId);

      if (result === null) {
        callback({ code: status.NOT_FOUND, message: 'Book not found' } as any, null as unknown as DeleteBookResponse);
        return;
      }

      callback(null, { message: result.message });
    } catch (err) {
      this.logger.error('BooksService.deleteBook failed', err);

      callback(err as ServiceError, null as unknown as DeleteBookResponse);
    }
  }
}
