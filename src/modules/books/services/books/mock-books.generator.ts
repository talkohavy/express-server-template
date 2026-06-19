import { faker } from '@faker-js/faker';
import type { Book } from '../../types';

export function generateMockBooks(count: number): Book[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: faker.book.title(),
    author: faker.book.author(),
    publishedYear: faker.number.int({ min: 1900, max: 2024 }),
    genre: faker.book.genre(),
    isbn: faker.commerce.isbn(),
    coverImageUrl: faker.image.url({ width: 300, height: 450 }),
    description: faker.lorem.paragraph({ min: 1, max: 3 }),
    pageCount: faker.number.int({ min: 100, max: 800 }),
    rating: faker.number.float({ min: 2, max: 5, fractionDigits: 1 }),
    language: faker.helpers.arrayElement([
      'English',
      'Spanish',
      'French',
      'German',
      'Italian',
      'Portuguese',
      'Japanese',
    ]),
    publisher: faker.book.publisher(),
    createdAt: faker.date.past({ years: 10 }).toISOString(),
  }));
}

export const DEFAULT_MOCK_BOOKS_COUNT = 100;
