import Joi from 'joi';
import { topicRule } from './rules';

export const leaveTopicSchema = Joi.object({
  topic: topicRule,
});
