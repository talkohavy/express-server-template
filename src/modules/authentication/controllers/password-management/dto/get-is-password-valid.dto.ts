import joi from 'joi';

export const getIsPasswordValidSchema = joi.object({
  password: joi.alternatives().try(joi.string(), joi.number()).required(),
  hashedPassword: joi.string().required(),
});
