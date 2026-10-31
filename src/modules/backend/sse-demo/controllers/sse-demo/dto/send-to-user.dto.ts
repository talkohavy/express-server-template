import Joi from 'joi';
import { textRule } from './rules';

export const sendToUserSchema = Joi.object({
  userId: Joi.string().trim().min(1).max(64).required(),
  text: textRule,
});
