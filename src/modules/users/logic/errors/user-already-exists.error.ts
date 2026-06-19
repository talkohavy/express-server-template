import { BaseError } from '@src/core/errors/BaseError';

export class UserAlreadyExistsError extends BaseError {
  constructor(email: string) {
    super({ name: UserAlreadyExistsError.name, message: `User with email ${email} already exists` });
  }
}
