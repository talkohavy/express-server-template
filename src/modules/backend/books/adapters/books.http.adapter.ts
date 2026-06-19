import { API_PATHS } from '@src/common/constants';
import { ServiceNames } from '@src/plugins/config-service';
import type { CreateBookDto, UpdateBookDto, Book, PaginatedBooksResponse } from '../../../books';
import type { HttpClient } from '../../logic/http-client';
import type { GetBooksParsedQuery } from '../types';
import type { IBooksAdapter } from './books.adapter.interface';

export class BooksHttpAdapter implements IBooksAdapter {
  constructor(private readonly httpClient: HttpClient) {}

  async getBooks(queryParams: GetBooksParsedQuery): Promise<PaginatedBooksResponse> {
    return this.httpClient.get<PaginatedBooksResponse>({
      serviceName: ServiceNames.Books,
      route: API_PATHS.books,
      options: { queryParams },
    });
  }

  async getBookById(bookId: string): Promise<Book | null> {
    const route = `${API_PATHS.books}/${bookId}`;
    return this.httpClient.get<Book | null>({
      serviceName: ServiceNames.Books,
      route,
    });
  }

  async createBook(data: CreateBookDto): Promise<Book> {
    return this.httpClient.post<Book>({
      serviceName: ServiceNames.Books,
      route: API_PATHS.books,
      body: data,
    });
  }

  async updateBook(bookId: string, data: UpdateBookDto): Promise<Book | null> {
    const route = `${API_PATHS.books}/${bookId}`;
    return this.httpClient.patch<Book | null>({
      serviceName: ServiceNames.Books,
      route,
      body: data,
    });
  }

  async deleteBook(bookId: string): Promise<{ message: string } | null> {
    const route = `${API_PATHS.books}/${bookId}`;
    return this.httpClient.delete<{ message: string } | null>({
      serviceName: ServiceNames.Books,
      route,
    });
  }
}
