import joi from 'joi';

export const revokeSessionSchema = joi.object({
  refreshToken: joi.string().required(),
});
