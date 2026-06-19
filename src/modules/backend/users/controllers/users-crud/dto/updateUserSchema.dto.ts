import Joi from 'joi';

export const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  nickname: Joi.string().min(1).max(30).optional(),
  dateOfBirth: Joi.date().optional(),
})
  .or('email', 'nickname', 'dateOfBirth')
  .required();
