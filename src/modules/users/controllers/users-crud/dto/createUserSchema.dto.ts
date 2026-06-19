import Joi from 'joi';
import { RoleTypes } from '@src/common/constants';

export const createUserSchema = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
    .required(), // <--- from Joi documentation
  password: Joi.string()
    .pattern(/^[a-zA-Z0-9]{1,30}$/)
    .required(), // <--- from Joi documentation
  nickname: Joi.string().min(3).max(30).optional(),
  dateOfBirth: Joi.date(),
  role: Joi.string()
    .valid(...Object.values(RoleTypes))
    .optional(),
  // repeatPassword: Joi.ref('password'), // <--- from Joi documentation
});
