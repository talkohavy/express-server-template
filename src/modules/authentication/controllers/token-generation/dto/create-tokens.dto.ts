import joi from 'joi';

export const createTokensSchema = joi.object({
  userId: joi.string().required(),
  role: joi.string().optional(),
  session: joi
    .object({
      id: joi.string().uuid().required(),
      expiresAt: joi.number().integer().positive().required(),
    })
    .optional(),
});
