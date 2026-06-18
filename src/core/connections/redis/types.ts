export type RedisConfig = {
  connectionString: string;
  /**
   * Optional name for the connection, useful for identifying in logs or monitoring.
   *
   * @default 'default'
   */
  connectionName: string;
  /**
   * Maximum number of retries for connection attempts.
   *
   * @default 5
   */
  maxRetries: number;
  retryTimeout: number;
  flushOnConnect: boolean;
};

export type RedisConnectionConstructorProps = Partial<RedisConfig>;
