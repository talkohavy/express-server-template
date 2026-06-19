export type CreateBookDto = {
  name: string;
  author: string;
  publishedYear: number;
  genre?: string;
  isbn?: string;
  coverImageUrl?: string;
  description?: string;
  pageCount?: number;
  rating?: number;
  language?: string;
  publisher?: string;
};

export type UpdateBookDto = {
  name?: string;
  author?: string;
  publishedYear?: number;
  genre?: string;
  isbn?: string;
  coverImageUrl?: string;
  description?: string;
  pageCount?: number;
  rating?: number;
  language?: string;
  publisher?: string;
};
