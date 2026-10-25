import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
  type HttpException,
} from '@src/core/errors';

export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

type TypeOfStatusCodes = typeof StatusCodes;
export type StatusCodeKeys = keyof TypeOfStatusCodes;
export type StatusCodeValues = TypeOfStatusCodes[StatusCodeKeys];

export const StatusCodeToError: Partial<Record<StatusCodeValues, new (...args: any[]) => HttpException>> = {
  [StatusCodes.BAD_REQUEST]: BadRequestError,
  [StatusCodes.UNAUTHORIZED]: UnauthorizedError,
  [StatusCodes.FORBIDDEN]: ForbiddenError,
  [StatusCodes.NOT_FOUND]: NotFoundError,
  [StatusCodes.TOO_MANY_REQUESTS]: TooManyRequestsError,
  [StatusCodes.INTERNAL_ERROR]: InternalServerError,
  [StatusCodes.SERVICE_UNAVAILABLE]: ServiceUnavailableError,
} as const;
