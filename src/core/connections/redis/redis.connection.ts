import { createClient, type RedisClientType } from 'redis';
import type { ConnectionFactory } from '@src/lib/lucky-server';
import type { RedisConfig, RedisConnectionConstructorProps } from './types';

export class RedisConnection implements ConnectionFactory {
  private redisClient: RedisClientType | null = null;
  private connectionPromise: Promise<RedisClientType> | null = null;
  private _config: RedisConfig;

  constructor(props?: RedisConnectionConstructorProps) {
    const {
      connectionString = 'redis://localhost:6379',
      connectionName = 'default',
      maxRetries = 5,
      retryTimeout = 15000,
      flushOnConnect = false,
    } = props ?? {};

    this._config = { connectionName, connectionString, maxRetries, retryTimeout, flushOnConnect };
  }

  public async connect(): Promise<RedisClientType> {
    // If already connected, return existing client
    if (this.redisClient?.isOpen) {
      console.log(`Already connected to Redis (${this._config.connectionName})`);
      return this.redisClient;
    }

    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      console.log(`Connection already in progress (${this._config.connectionName}), waiting for it to resolve...`);
      return this.connectionPromise;
    }

    // Start new connection
    this.connectionPromise = this.performConnection(this._config);

    try {
      const client = await this.connectionPromise;
      return client;
    } catch (error) {
      this.connectionPromise = null;
      throw error;
    }
  }

  ensureConnected() {
    if (!this.isConnected()) {
      throw new Error(`Redis client is not connected (${this._config.connectionName})`);
    }
  }

  private async performConnection(config: RedisConfig): Promise<RedisClientType> {
    try {
      // Clean up existing client if any
      if (this.redisClient) {
        await this.cleanupClient();
      }

      this.redisClient = createClient({
        url: this._config.connectionString,
        socket: {
          reconnectStrategy: (retriesSoFar: number) => {
            const maxRetries = this._config.maxRetries || 5;
            const retryTimeout = this._config.retryTimeout || 15000;

            if (retriesSoFar >= maxRetries) {
              console.error(
                `Max retries (${maxRetries}) reached. Cannot connect to Redis (${this._config.connectionName}).`,
              );
              return new Error('CANNOT_CONNECT_TO_REDIS');
            }

            console.warn(
              `Retrying Redis connection (${this._config.connectionName}) (${retriesSoFar + 1}/${maxRetries}) in ${retryTimeout / 1000} seconds...`,
            );

            return retryTimeout;
          },
        },
      });

      this.redisClient.on('error', (err) => {
        console.error(`❌ Redis connection error (${this._config.connectionName}):`, err);
      });

      this.redisClient.on('connect', () => {
        console.log(`✅ Redis client connected (${this._config.connectionName})`);
      });

      this.redisClient.on('disconnect', () => {
        console.warn(`🔌 Redis client disconnected (${this._config.connectionName})`);
      });

      await this.redisClient.connect();

      // Only flush in development and when explicitly requested
      if (process.env.NODE_ENV === 'development' && config.flushOnConnect) {
        await this.redisClient.flushAll();
        console.log(`FLUSHALL: Redis cache cleared successfully (${this._config.connectionName})!`);
      }

      return this.redisClient;
    } catch (error) {
      console.error(`Failed to connect to Redis (${this._config.connectionName}):`, error);
      this.redisClient = null;
      throw error;
    } finally {
      this.connectionPromise = null;
    }
  }

  public getClient(): RedisClientType | null {
    return this.redisClient;
  }

  public isConnected(): boolean {
    return this.redisClient?.isOpen || false;
  }

  public getConnectionName(): string {
    return this._config.connectionName;
  }

  public async disconnect(): Promise<void> {
    await this.cleanupClient();
    console.log(`Disconnected from Redis (${this._config.connectionName})`);
  }

  private async cleanupClient(): Promise<void> {
    if (this.redisClient) {
      try {
        if (this.redisClient.isOpen) {
          await this.redisClient.quit();
        }
        this.redisClient.removeAllListeners();
      } catch (error) {
        console.error(`Error during Redis cleanup (${this._config.connectionName}):`, error);
      } finally {
        this.redisClient = null;
      }
    }
  }
}
