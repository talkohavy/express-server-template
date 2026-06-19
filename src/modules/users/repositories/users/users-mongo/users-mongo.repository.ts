import { Types, type ApplyBasicCreateCasting, type QueryFilter } from 'mongoose';
import { UserModel } from '../../../../../databases/mongo/models/user/user.model';
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
    const { options: optionsRaw = {} } = options; // , fields

    const queryStatement: QueryFilter<Record<string, any>> = { email };
    const fieldProjection = undefined; // getProjection(fields);
    const queryOptions = { lean: true, ...optionsRaw };

    const userResult = (await UserModel.findOne(
      queryStatement,
      fieldProjection,
      queryOptions,
    )) as unknown as DatabaseUser;

    return userResult;
  }

  async createUser(body: CreateUserDto): Promise<DatabaseUser> {
    const userData: ApplyBasicCreateCasting<any> = { _id: new ObjectId(), ...body };

    const userResult = (await UserModel.create(userData)) as unknown as DatabaseUser;

    return userResult;
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

    const users = (await query.exec()) as unknown as Array<DatabaseUser>;

    return users;
  }

  async getUserById(userId: string, options: GetUserByIdOptions = {}): Promise<DatabaseUser | null> {
    const { options: optionsRaw = {} } = options; // fields,
    const projection = undefined; // getProjection(fields);
    const queryOptions = { lean: true, ...optionsRaw };

    const userResult = (await UserModel.findById(userId, projection, queryOptions)) as DatabaseUser | null; // <--- This query ONLY WORKS if you had manually declared an _id field in your model. If not, you'd get back an error saying: "Argument passed in must be a string of 12 bytes or a string of 24 hex characters or an integer"

    return userResult;
  }

  async updateUserById(userId: string, body: UpdateUserDto): Promise<DatabaseUser> {
    const queryStatement: QueryFilter<Record<string, any>> = { _id: userId };
    const updateStatement = [{ $addFields: body }];
    const updateOptions = { new: true, lean: true }; // As an alternative to the `new` option, you can also use the `returnOriginal` option. returnOriginal: false is equivalent to new: true. The returnOriginal option exists for consistency with the the MongoDB Node driver's findOneAndUpdate(), which has the same option.

    const updatedUser = (await UserModel.findOneAndUpdate(
      queryStatement,
      updateStatement,
      updateOptions,
    )) as unknown as DatabaseUser;

    return updatedUser;
  }

  async deleteUserById(userId: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(userId);
    return !!result;
  }
}
