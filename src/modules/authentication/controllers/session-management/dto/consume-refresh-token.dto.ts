import joi from 'joi';

export const consumeRefreshTokenSchema = joi.object({
  refreshToken: joi.string().required(),
});
