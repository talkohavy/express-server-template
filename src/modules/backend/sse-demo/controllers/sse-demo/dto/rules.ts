import Joi from 'joi';
import { SSE_DEMO_MAX_TEXT_LENGTH, SSE_DEMO_MAX_TOPIC_LENGTH } from '../../../logic/constants';

export const topicRule = Joi.string()
  .trim()
  .min(1)
  .max(SSE_DEMO_MAX_TOPIC_LENGTH)
  .pattern(/^[\w:.-]+$/)
  .required()
  .messages({ 'string.pattern.base': '"topic" may only contain letters, digits, and _ : . -' });

export const textRule = Joi.string().trim().min(1).max(SSE_DEMO_MAX_TEXT_LENGTH).required();
