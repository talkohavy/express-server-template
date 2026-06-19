import express, { type Application } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { BooksCrudController } from './books-crud.controller';
import type { BooksService } from '../../services/books/books.service';
import type { Book, PaginatedBooksResponse } from '../../types';

jest.mock('@src/middlewares/joi-body.middleware', () => ({
  joiBodyMiddleware: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

describe('BooksCrudController', () => {
  let app: Application;
  let mockBooksService: jest.Mocked<BooksService>;

  beforeEach(() => {
    app = express() as unknown as Application;
    app.use(express.json());

    app.logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    mockBooksService = {
      getBooks: jest.fn(),
      getBookById: jest.fn(),
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
    } as any;

    const controller = new BooksCrudController(app, mockBooksService);
    controller.registerRoutes();
  });

  describe('GET /api/books', () => {
    it('should return paginated books', async () => {
      const mockPaginatedResponse: PaginatedBooksResponse = {
        data: [
          {
            id: 1,
            name: 'Book 1',
            author: 'Author 1',
            publishedYear: 2020,
            genre: 'Fiction',
            isbn: '978-000000001-0',
            coverImageUrl: '',
            description: '',
            pageCount: 200,
            rating: 4,
            language: 'English',
            publisher: 'Test',
            createdAt: '2020-01-01T00:00:00.000Z',
          },
          {
            id: 2,
            name: 'Book 2',
            author: 'Author 2',
            publishedYear: 2021,
            genre: 'Fiction',
            isbn: '978-000000002-0',
            coverImageUrl: '',
            description: '',
            pageCount: 200,
            rating: 4,
            language: 'English',
            publisher: 'Test',
            createdAt: '2021-01-01T00:00:00.000Z',
          },
        ],
        totalItemsCount: 2,
        page: 1,
        limit: 20,
        totalPagesCount: 1,
        hasMore: false,
      };

      mockBooksService.getBooks.mockResolvedValue(mockPaginatedResponse);

      const response = await request(app).get(API_PATHS.books);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(mockPaginatedResponse);
      expect(mockBooksService.getBooks).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(app.logger.info).toHaveBeenCalledWith(`GET ${API_PATHS.books} - fetching books (page=1, limit=20)`);
    });

    it('should pass page and limit query params to service', async () => {
      mockBooksService.getBooks.mockResolvedValue({
        data: [],
        totalItemsCount: 0,
        page: 2,
        limit: 10,
        totalPagesCount: 0,
        hasMore: false,
      });

      await request(app).get(`${API_PATHS.books}?page=2&limit=10`);

      expect(mockBooksService.getBooks).toHaveBeenCalledWith({ page: 2, limit: 10 });
    });
  });

  describe('GET /api/books/:bookId', () => {
    it('should return a book when found', async () => {
      const mockBook = {
        id: 1,
        name: 'Test Book',
        author: 'Test Author',
        publishedYear: 2022,
        genre: 'Fiction',
        isbn: '',
        coverImageUrl: '',
        description: '',
        pageCount: 100,
        rating: 4,
        language: 'English',
        publisher: 'Test',
        createdAt: '2022-01-01T00:00:00.000Z',
      };

      mockBooksService.getBookById.mockResolvedValue(mockBook);

      const response = await request(app).get(`${API_PATHS.books}/1`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(mockBook);
      expect(mockBooksService.getBookById).toHaveBeenCalledWith('1');
    });

    it('should return 404 when book not found', async () => {
      mockBooksService.getBookById.mockResolvedValue(null);

      const response = await request(app).get(`${API_PATHS.books}/999`);

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(response.body).toEqual({ message: 'Book not found' });
      expect(app.logger.error).toHaveBeenCalledWith('Book not found', '999');
    });
  });

  describe('POST /api/books', () => {
    it('should create a new book', async () => {
      const bookData = { name: 'New Book', author: 'New Author', publishedYear: 2023 };
      const mockCreatedBook = { id: 501, ...bookData } as any;

      mockBooksService.createBook.mockResolvedValue(mockCreatedBook);

      const response = await request(app).post(API_PATHS.books).send(bookData);

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(response.body).toEqual(mockCreatedBook);
      expect(mockBooksService.createBook).toHaveBeenCalledWith(bookData);
    });
  });

  describe('PATCH /api/books/:bookId', () => {
    it('should update an existing book', async () => {
      const updateData = { name: 'Updated Name' };
      const mockUpdatedBook: Book = {
        id: 1,
        name: 'Updated Name',
        author: 'Author',
        publishedYear: 2020,
        genre: 'Fiction',
        isbn: '978-000000001-0',
        coverImageUrl: '',
        description: '',
        pageCount: 200,
        rating: 4,
        language: 'English',
        publisher: 'Test',
        createdAt: '2020-01-01T00:00:00.000Z',
      };

      mockBooksService.updateBook.mockResolvedValue(mockUpdatedBook);

      const response = await request(app).patch(`${API_PATHS.books}/1`).send(updateData);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(mockUpdatedBook);
      expect(mockBooksService.updateBook).toHaveBeenCalledWith('1', updateData);
    });

    it('should return 404 when book not found', async () => {
      mockBooksService.updateBook.mockResolvedValue(null);

      const response = await request(app).patch(`${API_PATHS.books}/999`).send({ name: 'Updated' });

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(response.body).toEqual({ message: 'Book not found' });
      expect(app.logger.error).toHaveBeenCalledWith('Book not found', '999');
    });
  });

  describe('DELETE /api/books/:bookId', () => {
    it('should delete an existing book', async () => {
      mockBooksService.deleteBook.mockResolvedValue({ message: 'Book deleted successfully' });

      const response = await request(app).delete(`${API_PATHS.books}/1`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual({ message: 'Book deleted successfully' });
      expect(mockBooksService.deleteBook).toHaveBeenCalledWith('1');
    });

    it('should return 404 when book not found', async () => {
      mockBooksService.deleteBook.mockResolvedValue(null);

      const response = await request(app).delete(`${API_PATHS.books}/999`);

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(response.body).toEqual({ message: 'Book not found' });
      expect(app.logger.error).toHaveBeenCalledWith('Book not found', '999');
    });
  });
});
