import pg, { type Client, type QueryResultRow } from 'pg';
import type { ConnectionFactory } from '@src/lib/lucky-server';

export class PostgresConnection implements ConnectionFactory {
  private static instance: PostgresConnection;
  private readonly dbClient: Client;

  private constructor(connectionString: string) {
    this.dbClient = new pg.Client(connectionString);
  }

  public static getInstance(connectionString?: string): PostgresConnection {
    if (!PostgresConnection.instance) {
      if (!connectionString) throw new Error('Database credentials are required for first initialization');

      PostgresConnection.instance = new PostgresConnection(connectionString);
    }
    return PostgresConnection.instance;
  }

  /**
   * @throws Error if connection fails
   */
  async connect() {
    try {
      await this.dbClient.connect();
      console.log('✅ Successfully Connected to Postgres!');
    } catch (error) {
      console.error('❌ Error connecting to PostgreSQL:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.dbClient.end();
      console.log('📴 Disconnected from PostgreSQL');
    } catch (error) {
      console.error('❌ Error disconnecting from PostgreSQL:', error);
    }
  }

  // Should not exist! This is for testing purposes only!
  async query<T extends QueryResultRow = any>(sql: any, params?: any) {
    try {
      const result = await this.dbClient.query<T>(sql, params);

      return result;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  public ensureConnected() {
    // @ts-expect-error
    if (!this.dbClient._connected) throw new Error('Database not connected');
  }

  public getClient(): Client {
    return this.dbClient;
  }
}
