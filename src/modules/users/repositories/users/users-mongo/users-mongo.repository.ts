import { Types, type ApplyBasicCreateCasting, type QueryFilter } from 'mongoose';
import { getProjection } from '@src/databases/mongo/logic/utils/getProjection';
import { UserModel } from '@src/databases/mongo/models/user/user.model';
import { mapMongoDocToDatabaseUser } from './logic/mapMongoDocToDatabaseUser';
import type { DatabaseUser } from '../../../types';
import type {
  IUsersRepository,
  GetUserByIdOptions,
  GetUsersProps,
  CreateUserDto,
  UpdateUserDto,
  GetUserByEmailOptions,
} from '../types';

const { ObjectId } = Types;

export class UsersMongoRepository implements IUsersRepository {
  async getUserByEmail(email: string, options: GetUserByEmailOptions = {}): Promise<DatabaseUser | null> {
    const { options: optionsRaw = {}, fields } = options;

    const queryStatement = { email } as any;
    const fieldProjection = getProjection(fields);
    const queryOptions = { lean: true, ...optionsRaw };

    const userResult = await UserModel.findOne(queryStatement, fieldProjection, queryOptions);

    const mappedUser = mapMongoDocToDatabaseUser({ doc: userResult });

    return mappedUser;
  }

  async createUser(body: CreateUserDto): Promise<DatabaseUser> {
    const userData: ApplyBasicCreateCasting<any> = { _id: new ObjectId(), ...body };

    const userResult = await UserModel.create(userData);

    const mappedUser = mapMongoDocToDatabaseUser({ doc: userResult.toObject() }) as DatabaseUser;

    return mappedUser;
  }

  async getUsers(props?: GetUsersProps): Promise<Array<DatabaseUser>> {
    let query = UserModel.find(props?.filter || {});

    if (props?.options?.skip) {
      query = query.skip(props.options.skip);
    }

    if (props?.options?.limit) {
      query = query.limit(props.options.limit);
    }

    if (props?.options?.sort) {
      // Convert the sort object to mongoose format
      const sortObj: Record<string, 1 | -1> = {};
      Object.entries(props.options.sort).forEach(([key, value]) => {
        sortObj[key] = value as 1 | -1;
      });
      query = query.sort(sortObj);
    }

    const rawUsers = await query.lean().exec();
    const users = rawUsers.map((doc) => mapMongoDocToDatabaseUser({ doc }) as DatabaseUser);

    return users;
  }

  async getUserById(userId: string, options: GetUserByIdOptions = {}): Promise<DatabaseUser | null> {
    const { options: optionsRaw = {} } = options; // fields,
    const projection = undefined; // getProjection(fields);
    const queryOptions = { lean: true, ...optionsRaw };

    const userResult = await UserModel.findById(userId, projection, queryOptions); // <--- This query ONLY WORKS if you had manually declared an _id field in your model. If not, you'd get back an error saying: "Argument passed in must be a string of 12 bytes or a string of 24 hex characters or an integer"

    const mappedUser = mapMongoDocToDatabaseUser({ doc: userResult });

    return mappedUser;
  }

  async updateUserById(userId: string, body: UpdateUserDto): Promise<DatabaseUser> {
    const queryStatement: QueryFilter<Record<string, any>> = { _id: userId };
    const updateStatement = [{ $addFields: body }];
    const updateOptions = { new: true, lean: true }; // As an alternative to the `new` option, you can also use the `returnOriginal` option. returnOriginal: false is equivalent to new: true. The returnOriginal option exists for consistency with the the MongoDB Node driver's findOneAndUpdate(), which has the same option.

    const updatedDoc = await UserModel.findOneAndUpdate(queryStatement, updateStatement, updateOptions);

    const updatedUser = mapMongoDocToDatabaseUser({ doc: updatedDoc }) as DatabaseUser;

    return updatedUser;
  }

  async deleteUserById(userId: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(userId);
    return !!result;
  }
}
