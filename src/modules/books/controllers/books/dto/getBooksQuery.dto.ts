import Joi from 'joi';

export const getBooksQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  // sortBy: Joi.string().optional(),
  // sortDirection: Joi.string().optional(),
  q: Joi.string().optional(), // <--- currently not being used
  category: Joi.string().optional(), // <--- currently not being used
});
