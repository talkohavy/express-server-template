import mongoose from 'mongoose';
import { userSchemaTemplate } from './user.schema.template';
import type { DatabaseUser } from '@src/modules/users';
import type { SchemaTemplate } from '../../types';

const { Schema, model } = mongoose;

// Step 1: Create the schema - which defines the structure
const userSchema = new Schema(userSchemaTemplate, {
  collection: 'users',
  toJSON: {
    transform(_doc, _ret) {
      // Note: Fields will be available on backend, but will not transfer to frontend
      // delete ret.hashed_password;
      // delete ret.__v;
      // delete ret._id;
    },
  },
  timestamps: false,
});

// Step 2: attach 'pre' and/or 'post' hooks onto your schema object
// Delete all fields  with { select: false } after a successful document creation.
userSchema.post('save', (doc) => {
  function removePropertiesRecursivelyAfterCreate(
    partialSchemaTemplate: SchemaTemplate,
    newDocSubTree: Record<string, any>,
  ) {
    for (const key in partialSchemaTemplate) {
      const currentField = partialSchemaTemplate[key]!;

      if ('select' in currentField && currentField.select === false) {
        delete newDocSubTree[key];
      } else if (typeof currentField.type === 'object' && !Array.isArray(currentField.type)) {
        removePropertiesRecursivelyAfterCreate(currentField.type, newDocSubTree[key]);
      }
    }
  }

  const docObj = doc.toObject();

  removePropertiesRecursivelyAfterCreate(userSchemaTemplate, docObj);

  return docObj;
});

// Step 6: Create a model based on that schema
// Note: The first argument (the string) has to be the singular name of the collection your model!
// Because mongoose pluralize it, and looks for the pluralized lowercased version of the model name in your database.
export const UserModel = model<DatabaseUser>('user', userSchema);
