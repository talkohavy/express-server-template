import { RoleTypes } from '@src/common/constants';
import type { CreateUserDto } from '../../services/users-crud/types';
import type { DatabaseUser } from '../../types';

export function createNewUserPayload(body: CreateUserDto) {
  const createdUserValues: Omit<DatabaseUser, 'id'> = {
    email: body.email,
    nickname: body.nickname,
    date_of_birth: new Date(body.dateOfBirth).getTime(),
    hashed_password: body.password,
    role: body.role ?? RoleTypes.User,
  };

  return createdUserValues;
}
