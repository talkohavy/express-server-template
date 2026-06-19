import { BooksService } from './books.service';

describe('BooksService', () => {
  let service: BooksService;

  beforeEach(() => {
    service = new BooksService();
  });

  describe('getBooks', () => {
    it('should return paginated books with default page and limit', async () => {
      const result = await service.getBooks({ page: 1, limit: 20 });

      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeLessThanOrEqual(20);
      expect(result.totalItemsCount).toBeGreaterThanOrEqual(100);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPagesCount).toBeGreaterThanOrEqual(5);
      expect(result.hasMore).toBe(true);
      expect(result.data[0]).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        author: expect.any(String),
        publishedYear: expect.any(Number),
        genre: expect.any(String),
        isbn: expect.any(String),
        coverImageUrl: expect.any(String),
        description: expect.any(String),
        pageCount: expect.any(Number),
        rating: expect.any(Number),
        language: expect.any(String),
        publisher: expect.any(String),
        createdAt: expect.any(String),
      });
    });

    it('should return correct page and limit when specified', async () => {
      const result = await service.getBooks({ page: 2, limit: 10 });

      expect(result.data.length).toBeLessThanOrEqual(10);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getBookById', () => {
    it('should return a book when found', async () => {
      const created = await service.createBook({ name: 'Test Book', author: 'Test Author', publishedYear: 2022 });

      const book = await service.getBookById(String(created.id));

      expect(book).toMatchObject({ name: 'Test Book', author: 'Test Author', publishedYear: 2022 });
      expect(book).toHaveProperty('genre');
      expect(book).toHaveProperty('isbn');
      expect(book).toHaveProperty('createdAt');
    });

    it('should return an existing mock book by id', async () => {
      const book = await service.getBookById('1');

      expect(book).not.toBeNull();
      expect(book?.id).toBe(1);
    });

    it('should return null when book not found', async () => {
      const book = await service.getBookById('999999');

      expect(book).toBeNull();
    });
  });

  describe('createBook', () => {
    it('should create a new book with required fields', async () => {
      const bookData = { name: 'New Book', author: 'New Author', publishedYear: 2023 };

      const result = await service.createBook(bookData);

      expect(result).toMatchObject(bookData);
      expect(result.id).toBeDefined();
      expect(result.genre).toBe('Fiction');
      expect(result.language).toBe('English');
      expect(result.createdAt).toBeDefined();
    });

    it('should create a new book with optional fields', async () => {
      const bookData = {
        name: 'Full Book',
        author: 'Full Author',
        publishedYear: 2022,
        genre: 'Science Fiction',
        description: 'A great read',
        pageCount: 400,
        rating: 4.5,
      };

      const result = await service.createBook(bookData);

      expect(result).toMatchObject(bookData);
    });
  });

  describe('updateBook', () => {
    it('should update an existing book', async () => {
      const created = await service.createBook({ name: 'Old Name', author: 'Old Author', publishedYear: 2020 });

      const result = await service.updateBook(String(created.id), { name: 'Updated Name' });

      expect(result).toMatchObject({ name: 'Updated Name', author: 'Old Author', publishedYear: 2020 });
    });

    it('should return null when book not found', async () => {
      const result = await service.updateBook('999999', { name: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('deleteBook', () => {
    it('should delete an existing book', async () => {
      const created = await service.createBook({ name: 'To Delete', author: 'Author', publishedYear: 2020 });

      const result = await service.deleteBook(String(created.id));

      expect(result).toEqual({ message: 'Book deleted successfully' });

      const book = await service.getBookById(String(created.id));
      expect(book).toBeNull();
    });

    it('should return null when book not found', async () => {
      const result = await service.deleteBook('999999');

      expect(result).toBeNull();
    });
  });
});
