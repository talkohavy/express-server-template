import type { Book, PaginatedBooksResponse, CreateBookDto, UpdateBookDto } from '../../../books';
import type { GetBooksParsedQuery } from '../types';

export interface IBooksAdapter {
  getBooks(query: GetBooksParsedQuery): Promise<PaginatedBooksResponse>;
  getBookById(bookId: string): Promise<Book | null>;
  createBook(data: CreateBookDto): Promise<Book>;
  updateBook(bookId: string, data: UpdateBookDto): Promise<Book | null>;
  deleteBook(bookId: string): Promise<{ message: string } | null>;
}
