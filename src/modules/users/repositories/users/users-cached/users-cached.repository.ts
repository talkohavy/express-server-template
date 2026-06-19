import { USER_CACHE_TTL_SECONDS } from './logic/constants';
import { getUserCacheKey } from './logic/utils/getUserCacheKey';
import type { RedisClientType } from 'redis';
import type { DatabaseUser } from '../../../types';
import type {
  IUsersRepository,
  GetUserByIdOptions,
  GetUsersProps,
  CreateUserDto,
  UpdateUserDto,
  GetUserByEmailOptions,
} from '../types';

export class UsersCachedRepository implements IUsersRepository {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly redis: RedisClientType,
  ) {}

  async getUserById(userId: string, options?: GetUserByIdOptions): Promise<DatabaseUser | null> {
    const cacheKey = getUserCacheKey(userId);
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as DatabaseUser;
    }

    const user = await this.usersRepository.getUserById(userId, options);

    if (user) {
      await this.redis.setEx(cacheKey, USER_CACHE_TTL_SECONDS, JSON.stringify(user));
    }

    return user;
  }

  async createUser(body: CreateUserDto): Promise<DatabaseUser> {
    const createdUser = await this.usersRepository.createUser(body);

    const cacheKey = getUserCacheKey(String(createdUser.id));
    await this.redis.setEx(cacheKey, USER_CACHE_TTL_SECONDS, JSON.stringify(createdUser));

    return createdUser;
  }

  async updateUserById(userId: string, body: UpdateUserDto): Promise<DatabaseUser> {
    const updatedUser = await this.usersRepository.updateUserById(userId, body);

    const cacheKey = getUserCacheKey(userId);
    await this.redis.setEx(cacheKey, USER_CACHE_TTL_SECONDS, JSON.stringify(updatedUser));

    return updatedUser;
  }

  async deleteUserById(userId: string): Promise<boolean> {
    const result = await this.usersRepository.deleteUserById(userId);

    const cacheKey = getUserCacheKey(userId);
    await this.redis.del(cacheKey);

    return result;
  }

  async getUsers(props?: GetUsersProps): Promise<Array<DatabaseUser>> {
    return this.usersRepository.getUsers(props);
  }

  async getUserByEmail(email: string, options?: GetUserByEmailOptions): Promise<DatabaseUser | null> {
    return this.usersRepository.getUserByEmail(email, options);
  }
}
