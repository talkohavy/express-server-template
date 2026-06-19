import { parseJson } from '@src/common/utils/parseJson';
import { USER_CACHE_TTL_SECONDS } from './logic/constants';
import { getUserCacheKey } from './logic/utils/getUserCacheKey';
import type { RedisClientType } from 'redis';
import type { UsersCacheMetricsService } from '../../../services/users-cache-metrics';
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
    private readonly cacheMetrics: UsersCacheMetricsService,
  ) {}

  async getUserById(userId: string, options?: GetUserByIdOptions): Promise<DatabaseUser | null> {
    const userIdCacheKey = getUserCacheKey(userId);

    const userCacheHit = await this.redis.get(userIdCacheKey);

    if (userCacheHit) {
      this.cacheMetrics.onHit();
      return parseJson<DatabaseUser>(userCacheHit);
    }

    this.cacheMetrics.onMiss();

    const userFromDB = await this.usersRepository.getUserById(userId, options);

    if (userFromDB) {
      await this.redis.setEx(userIdCacheKey, USER_CACHE_TTL_SECONDS, JSON.stringify(userFromDB));
    }

    return userFromDB;
  }

  async createUser(body: CreateUserDto): Promise<DatabaseUser> {
    const createdUser = await this.usersRepository.createUser(body);

    const userIdCacheKey = getUserCacheKey(String(createdUser.id));

    await this.redis.setEx(userIdCacheKey, USER_CACHE_TTL_SECONDS, JSON.stringify(createdUser));

    return createdUser;
  }

  async updateUserById(userId: string, body: UpdateUserDto): Promise<DatabaseUser> {
    const updatedUser = await this.usersRepository.updateUserById(userId, body);

    const userIdCacheKey = getUserCacheKey(userId);

    await this.redis.setEx(userIdCacheKey, USER_CACHE_TTL_SECONDS, JSON.stringify(updatedUser));

    return updatedUser;
  }

  async deleteUserById(userId: string): Promise<boolean> {
    const result = await this.usersRepository.deleteUserById(userId);

    const userIdCacheKey = getUserCacheKey(userId);

    await this.redis.del(userIdCacheKey);

    return result;
  }

  /**
   * No caching involved in this method,
   * because so many filtering options are possible.
   */
  async getUsers(props?: GetUsersProps): Promise<Array<DatabaseUser>> {
    return this.usersRepository.getUsers(props);
  }

  /**
   * No caching involved in this method,
   * because so many query options are possible.
   *
   * I.e. requesting specific fields.
   */
  async getUserByEmail(email: string, options?: GetUserByEmailOptions): Promise<DatabaseUser | null> {
    return this.usersRepository.getUserByEmail(email, options);
  }
}
