import mongoose, { type Mongoose } from 'mongoose';
import type { ConnectionFactory } from '@src/lib/lucky-server';

export class MongodbConnection implements ConnectionFactory {
  private static instance: MongodbConnection;
  private dbClient: Mongoose;
  private isConnected = false;
  private credentials: { connectionString: string };

  private constructor(connectionString: string) {
    this.credentials = { connectionString };
    this.dbClient = mongoose;
  }

  public static getInstance(connectionString?: string): MongodbConnection {
    if (!MongodbConnection.instance) {
      if (!connectionString) throw new Error('Database credentials are required for first initialization');

      MongodbConnection.instance = new MongodbConnection(connectionString);
    }
    return MongodbConnection.instance;
  }

  public connect() {
    if (this.isConnected) return;

    console.log('🔗 Attempting to connect to MongoDB...');

    const MAX_RETRIES = 5;
    const RETRY_TIMEOUT = 5000;
    let retriesSoFar = 0;

    const connectWithRetry = async (): Promise<void> => {
      try {
        const { connectionString } = this.credentials;

        await this.dbClient.connect(connectionString, {
          maxPoolSize: 10, // Maintain up to 10 socket connections
          serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
          socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        });

        this.isConnected = true;
        console.log('✅ Successfully connected to MongoDB');
      } catch (error) {
        retriesSoFar++;
        console.error(`❌ Failed to connect to MongoDB (attempt ${retriesSoFar}/${MAX_RETRIES}):`, error);

        if (retriesSoFar >= MAX_RETRIES) {
          console.error('🚨 Max retries reached. MongoDB will not try to connect anymore.');
          throw new Error('Max retries reached. MongoDB connection failed.');
        }

        console.log(`🔄 Retrying connection in ${RETRY_TIMEOUT / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_TIMEOUT));
        return connectWithRetry();
      }
    };

    return connectWithRetry();
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.dbClient.disconnect();
      this.isConnected = false;
      console.log('📴 Disconnected from MongoDB');
    }
  }

  public getIsHealthy(): boolean {
    const isHealthy = this.isConnected && this.dbClient.connection.readyState === 1;

    return isHealthy;
  }

  public ensureConnected() {
    if (!this.isConnected) throw new Error('Database is not connected. Call connect() first.');
  }

  public getClient(): Mongoose {
    return this.dbClient;
  }
}
