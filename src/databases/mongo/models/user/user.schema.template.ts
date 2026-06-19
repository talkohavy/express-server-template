import mongoose from 'mongoose';
import { separateSensitiveFromNonSensitiveFields } from '../../logic/utils/separateSensitiveFromNonSensitiveFields';
import type { SchemaTemplate } from '../../types';

const { Types } = mongoose;

export const userSchemaTemplate: SchemaTemplate = {
  /**
   * Type of _id here MUST be ObjectId! Because mongodb ALWAYS stores _id as ObjectId.
   * Event if you put here String, and pass new ObjectId(myStr), `mongoose` would still convert it to string.
   * In that case, for a GET request, you would get null! As if the user does not exist.
   */
  _id: { type: Types.ObjectId, required: true, unique: true },
  email: { type: String, required: true, index: true, unique: true, lowercase: true, needPermission: true },
  hashed_password: { type: String, required: true, needPermission: true },
  nickname: { type: String, default: '', required: true, index: true, unique: true },
};

export const { sensitiveFields, nonSensitiveFields } = separateSensitiveFromNonSensitiveFields(userSchemaTemplate);
