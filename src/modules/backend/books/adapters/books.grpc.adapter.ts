import { status } from '@grpc/grpc-js';
import type {
  BooksServiceClient,
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
import type { Book, PaginatedBooksResponse, CreateBookDto, UpdateBookDto } from '@src/modules/books';
import type { GetBooksParsedQuery } from '../types';
import type { IBooksAdapter } from './books.adapter.interface';

export class BooksGrpcAdapter implements IBooksAdapter {
  constructor(private readonly booksGrpcClient: BooksServiceClient) {}

  async getBooks(query: GetBooksParsedQuery): Promise<PaginatedBooksResponse> {
    const request: GetBooksRequest = { page: query.page, limit: query.limit };

    const response = await this.unaryPromise<GetBooksRequest, GetBooksResponse>({
      client: this.booksGrpcClient,
      method: this.booksGrpcClient.getBooks.bind(this.booksGrpcClient),
      request,
    });

    return {
      data: response.data as Book[],
      totalItemsCount: response.totalItemsCount,
      page: response.page,
      limit: response.limit,
      totalPagesCount: response.totalPagesCount,
      hasMore: response.hasMore,
    };
  }

  async getBookById(bookId: string): Promise<Book | null> {
    const request: GetBookByIdRequest = { bookId };

    try {
      const response = await this.unaryPromise<GetBookByIdRequest, GetBookByIdResponse>({
        client: this.booksGrpcClient,
        method: this.booksGrpcClient.getBookById.bind(this.booksGrpcClient),
        request,
      });

      if (response.book === undefined) return null;

      return response.book as Book;
    } catch (err) {
      const code = err.code;
      if (code === status.NOT_FOUND) return null;
      throw err;
    }
  }

  async createBook(data: CreateBookDto): Promise<Book> {
    const request: CreateBookRequest = {
      name: data.name,
      author: data.author,
      publishedYear: data.publishedYear,
      genre: data.genre,
      isbn: data.isbn,
      coverImageUrl: data.coverImageUrl,
      description: data.description,
      pageCount: data.pageCount,
      rating: data.rating,
      language: data.language,
      publisher: data.publisher,
    };

    const response = await this.unaryPromise<CreateBookRequest, CreateBookResponse>({
      client: this.booksGrpcClient,
      method: this.booksGrpcClient.createBook.bind(this.booksGrpcClient),
      request,
    });

    if (response.book === undefined) {
      throw new Error('Books gRPC createBook returned no book');
    }

    return response.book as Book;
  }

  async updateBook(bookId: string, data: UpdateBookDto): Promise<Book | null> {
    const request: UpdateBookRequest = {
      bookId,
      name: data.name,
      author: data.author,
      publishedYear: data.publishedYear,
      genre: data.genre,
      isbn: data.isbn,
      coverImageUrl: data.coverImageUrl,
      description: data.description,
      pageCount: data.pageCount,
      rating: data.rating,
      language: data.language,
      publisher: data.publisher,
    };

    try {
      const response = await this.unaryPromise<UpdateBookRequest, UpdateBookResponse>({
        client: this.booksGrpcClient,
        method: this.booksGrpcClient.updateBook.bind(this.booksGrpcClient),
        request,
      });

      if (response.book === undefined) return null;

      return response.book as Book;
    } catch (err) {
      const code = err.code;
      if (code === status.NOT_FOUND) return null;
      throw err;
    }
  }

  async deleteBook(bookId: string): Promise<{ message: string } | null> {
    const request: DeleteBookRequest = { bookId };

    try {
      const response = await this.unaryPromise<DeleteBookRequest, DeleteBookResponse>({
        client: this.booksGrpcClient,
        method: this.booksGrpcClient.deleteBook.bind(this.booksGrpcClient),
        request,
      });

      return { message: response.message };
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === status.NOT_FOUND) return null;
      throw err;
    }
  }

  private unaryPromise<Req, Res>(props: {
    client: BooksServiceClient;
    method: (req: Req, callback: (err: unknown, res?: Res) => void) => void;
    request: Req;
  }): Promise<Res> {
    const { client, method, request } = props;

    return new Promise((resolve, reject) => {
      method.call(client, request, (err: unknown, res?: Res) => {
        if (err != null) return void reject(err);

        resolve(res as Res);
      });
    });
  }
}
