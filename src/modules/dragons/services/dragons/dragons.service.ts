import { DRAGON_ID_COUNTER_KEY, DRAGONS_KEY } from '../../logic/constants';
import type { RedisClientType } from 'redis';
import type { Dragon } from '../../types';
import type { CreateDragonDto, UpdateDragonDto } from './types';

export class DragonsService {
  constructor(private readonly redis: RedisClientType) {}

  async createDragon(payload: CreateDragonDto): Promise<Dragon> {
    const { name, element, wingSpan, age } = payload;

    // Increment and get new ID atomically
    const newId = await this.redis.incr(DRAGON_ID_COUNTER_KEY);

    const newDragon: Dragon = { id: newId, name, element, wingSpan, age };

    await this.redis.hSet(DRAGONS_KEY, String(newId), JSON.stringify(newDragon));

    return newDragon;
  }

  async getDragons(): Promise<Array<Dragon>> {
    const dragonsJson = await this.redis.hGetAll(DRAGONS_KEY);
    const dragons = Object.values(dragonsJson).map((json) => JSON.parse(json) as Dragon);
    return dragons;
  }

  async getDragonById(dragonId: string): Promise<Dragon | null> {
    const dragonJson = await this.redis.hGet(DRAGONS_KEY, dragonId);

    if (!dragonJson) return null;

    return JSON.parse(dragonJson) as Dragon;
  }

  async updateDragon(dragonId: string, updates: UpdateDragonDto): Promise<Dragon | null> {
    const existingDragonJson = await this.redis.hGet(DRAGONS_KEY, dragonId);

    if (!existingDragonJson) return null;

    const existingDragon = JSON.parse(existingDragonJson) as Dragon;
    const updatedDragon: Dragon = { ...existingDragon, ...updates };

    await this.redis.hSet(DRAGONS_KEY, dragonId, JSON.stringify(updatedDragon));

    return updatedDragon;
  }

  async deleteDragon(dragonId: string): Promise<{ message: string } | null> {
    const deleted = await this.redis.hDel(DRAGONS_KEY, dragonId);

    if (deleted === 0) return null;

    return { message: 'Dragon deleted successfully' };
  }
}
