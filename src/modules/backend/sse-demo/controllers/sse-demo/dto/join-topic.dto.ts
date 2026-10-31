import Joi from 'joi';
import { topicRule } from './rules';

export const joinTopicSchema = Joi.object({
  topic: topicRule,
});
