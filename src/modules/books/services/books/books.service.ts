import { getBoundedLimit, getBoundedPage } from '@src/common/utils/pagination';
import { InternalServerError } from '@src/core/errors';
import { DEFAULT_MOCK_BOOKS_COUNT, generateMockBooks } from './mock-books.generator';
import type { Book, GetBooksParsedQuery, PaginatedBooksResponse } from '../../types';
import type { CreateBookDto, UpdateBookDto } from './types';

const database: Array<Book> = generateMockBooks(DEFAULT_MOCK_BOOKS_COUNT);

const MAX_LIMIT = 100;

export class BooksService {
  async getBooks(query: GetBooksParsedQuery): Promise<PaginatedBooksResponse> {
    const { page: pageInput, limit: limitInput } = query;

    // Get total items count:
    const totalItemsCount = database.length;

    // Update pagination query parameters:
    const boundedLimit = getBoundedLimit({ limit: limitInput, maxLimit: MAX_LIMIT });
    const boundedPage = getBoundedPage({ page: pageInput, limit: boundedLimit, totalItemsCount });

    // Mock DB pagination query:
    const offset = boundedLimit * boundedPage;
    const totalPagesCount = totalItemsCount === 0 ? 0 : Math.ceil(totalItemsCount / boundedLimit);
    const data = database.slice(offset, offset + boundedLimit);

    const page = boundedPage + 1; // <--- 1-based for response

    if (Math.random() < 0.01) throw new InternalServerError('Mock error');

    await new Promise((resolve) => setTimeout(resolve, 30));

    return { data, totalItemsCount, page, limit: boundedLimit, totalPagesCount, hasMore: page < totalPagesCount };
  }

  async getBookById(userId: string): Promise<Book | null> {
    const book = database.find((book) => book.id === Number.parseInt(userId, 10));

    if (!book) return null;

    return book;
  }

  async createBook(book: CreateBookDto): Promise<Book> {
    const now = new Date().toISOString();

    const newBook: Book = {
      id: database.length > 0 ? Math.max(...database.map((b) => b.id)) + 1 : 1,
      name: book.name,
      author: book.author,
      publishedYear: book.publishedYear,
      genre: book.genre ?? 'Fiction',
      isbn: book.isbn ?? `978-${String(Date.now()).slice(-9)}-0`,
      coverImageUrl: book.coverImageUrl ?? 'https://picsum.photos/seed/new/300/450',
      description: book.description ?? '',
      pageCount: book.pageCount ?? 0,
      rating: book.rating ?? 0,
      language: book.language ?? 'English',
      publisher: book.publisher ?? 'Unknown',
      createdAt: now,
    };

    database.push(newBook);

    return newBook;
  }

  async updateBook(userId: string, user: UpdateBookDto): Promise<Book | null> {
    const parsedId = Number.parseInt(userId, 10);
    const bookIndex = database.findIndex((book) => book.id === parsedId);

    if (bookIndex === -1) return null;

    database[bookIndex] = { ...database[bookIndex], ...user } as Book;

    return database[bookIndex];
  }

  async deleteBook(userId: string) {
    const parsedId = Number.parseInt(userId, 10);
    const bookIndex = database.findIndex((book) => book.id === parsedId);

    if (bookIndex === -1) return null;

    database.splice(bookIndex, 1);

    return { message: 'Book deleted successfully' };
  }
}
