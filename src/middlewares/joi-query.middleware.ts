import { BadRequestError } from '@src/core/errors';
import type { NextFunction, Request, Response } from 'express';
import type Joi from 'joi';

export function joiQueryMiddleware(validationSchema: Joi.ObjectSchema<any>): any {
  return function validateUsingJoi(req: Request, _res: Response, next: NextFunction) {
    const { query } = req;

    const { error, value: castedValues } = validationSchema.validate(query);

    if (error) throw new BadRequestError(error.message);

    req.queryParsed = castedValues;

    next();
  };
}
