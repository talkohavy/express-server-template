import type { QueryOptions } from 'mongoose';
import type { RoleTypeValues } from '@src/common/constants';
import type { DatabaseUser } from '../types';

export type GetUserByEmailOptions = {
  fields?: any;
  /**
   * _**lean**_ option is set to `true` by default.
   */
  options?: QueryOptions;
};

export type CreateUserDto = Omit<DatabaseUser, 'id'>;

export type GetUsersProps = {
  filter: any;
  fields: any;
  options: {
    limit: number;
    skip: number;
    sort: Record<string, number>;
  };
};

export type GetUserByIdOptions = any;

export type UpdateUserDto = {
  name?: string;
  age?: number;
  email?: string;
  role?: RoleTypeValues;
};
