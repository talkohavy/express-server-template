import Joi from 'joi';
import { textRule, topicRule } from './rules';

export const sendToTopicSchema = Joi.object({
  topic: topicRule,
  text: textRule,
});
