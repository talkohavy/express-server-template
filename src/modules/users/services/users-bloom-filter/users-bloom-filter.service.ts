import { BLOOM_FILTER_ERROR_RATE, BLOOM_FILTER_INITIAL_CAPACITY, USERS_BLOOM_FILTER_KEY } from './logic/constants';
import type { RedisClientType } from 'redis';

export class UsersBloomFilterService {
  constructor(private readonly redis: RedisClientType) {}

  /**
   * Creates the Bloom filter in Redis with the configured error rate and capacity.
   * Safe to call on every startup — silently ignores the error if the key already exists.
   */
  async initialize(): Promise<void> {
    try {
      await this.redis.bf.reserve(USERS_BLOOM_FILTER_KEY, BLOOM_FILTER_ERROR_RATE, BLOOM_FILTER_INITIAL_CAPACITY);
    } catch {
      // Filter already exists from a previous startup — no-op.
    }
  }

  /**
   * Bulk-loads existing user IDs into the filter on startup.
   * BF.MADD is idempotent — re-adding a present item is safe.
   */
  async seed(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    await this.redis.bf.mAdd(USERS_BLOOM_FILTER_KEY, userIds);
  }

  /**
   * Registers a newly created user ID in the filter.
   */
  async add(userId: string): Promise<void> {
    await this.redis.bf.add(USERS_BLOOM_FILTER_KEY, userId);
  }

  /**
   * Drops the filter and recreates it empty.
   */
  async reset(): Promise<void> {
    await this.redis.del(USERS_BLOOM_FILTER_KEY);
    await this.initialize();
  }

  /**
   * Returns false if the ID is definitely not in the DB.
   * Returns true if the ID is possibly in the DB (proceed to cache/DB).
   */
  async mightExist(userId: string): Promise<boolean> {
    const isPotentiallyInDB = await this.redis.bf.exists(USERS_BLOOM_FILTER_KEY, userId);

    return isPotentiallyInDB;
  }
}
