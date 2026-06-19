import joi from 'joi';

export const createTokensSchema = joi.object({
  userId: joi.string().required(),
  role: joi.string().optional(),
});
