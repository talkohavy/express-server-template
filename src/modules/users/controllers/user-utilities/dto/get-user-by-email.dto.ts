import joi from 'joi';

export const getUserByEmailSchema = joi.object({
  // email: joi.string().email().required(),
  email: joi.string().required(),
});
