import Joi from 'joi';
import { DragonElements } from '../../../logic/constants';

const validElementValues = Object.values(DragonElements);

export const updateDragonSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  element: Joi.string().valid(...validElementValues),
  wingSpan: Joi.number().positive(),
  age: Joi.number().integer().min(0),
});
