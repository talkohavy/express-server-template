export type CreateUserDto = {
  email: string;
  password: string;
  nickname: string;
  dateOfBirth: number | string;
  role?: any;
};

export type UpdateUserDto = {
  email?: string;
  password?: string;
  nickname?: string;
  dateOfBirth?: number | string;
  role?: any;
};
