import { UserFields } from './user.fields';

export const sensitiveFields = [UserFields.email, UserFields.hashed_password];
export const nonSensitiveFields = [UserFields.id, UserFields.nickname];
