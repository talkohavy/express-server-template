import Joi from 'joi';

export const updateBookSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  author: Joi.string(),
  publishedYear: Joi.number().integer().min(1900).max(2030),
  genre: Joi.string().max(50),
  isbn: Joi.string().max(20),
  coverImageUrl: Joi.string().uri().max(500),
  description: Joi.string().max(2000),
  pageCount: Joi.number().integer().min(0),
  rating: Joi.number().min(0).max(5),
  language: Joi.string().max(50),
  publisher: Joi.string().max(100),
});
