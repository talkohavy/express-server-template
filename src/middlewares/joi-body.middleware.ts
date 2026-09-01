import { BadRequestError } from '@src/core/errors';
import type { NextFunction, Request, Response } from 'express';
import type Joi from 'joi';

export function joiBodyMiddleware(validationSchema: Joi.ObjectSchema<any>): any {
  return function validateUsingJoi(req: Request, _res: Response, next: NextFunction) {
    const { body } = req;

    const { error, value: castedValues } = validationSchema.validate(body);

    if (error) {
      console.log('Validation error', error);
      throw new BadRequestError(error.message);
    }

    req.bodyParsed = castedValues;

    next();
  };
}
