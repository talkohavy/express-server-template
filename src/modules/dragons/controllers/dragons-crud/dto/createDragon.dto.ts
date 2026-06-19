import Joi from 'joi';
import { DragonElements } from '../../../logic/constants';

const validElementValues = Object.values(DragonElements);

export const createDragonSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  element: Joi.string()
    .valid(...validElementValues)
    .required(),
  wingSpan: Joi.number().positive().required(),
  age: Joi.number().integer().min(0).required(),
});
