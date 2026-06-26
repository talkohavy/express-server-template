export const UserFields = {
  id: 'id',
  email: 'email',
  hashed_password: 'hashed_password',
  nickname: 'nickname',
} as const;

export type UserFieldValues = (typeof UserFields)[keyof typeof UserFields];
