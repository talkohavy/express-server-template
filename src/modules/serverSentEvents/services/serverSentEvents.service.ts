import { createEventMessage } from '../utils/createEventMessage';
import type { RedisClientType } from 'redis';
import type { LoggerService } from '@src/core/services/logger';

export class ServerSentEventsService {
  private readonly clients: Array<any> = [];

  constructor(
    private readonly logger: LoggerService,
    private readonly redisPubClient: RedisClientType,
    private readonly redisSubClient: RedisClientType,
  ) {
    this.redisSubClient.subscribe('sse-events', (content) => {
      this.logger.log('Received event:', content);

      this.clients.forEach((client) => {
        const message = createEventMessage({ content, eventName: 'luckylove-data' });
        client.write(message);
        client.flushHeaders();
      });
    });
  }

  addClient(client: any) {
    this.logger.log('socket joined!');
    this.clients.push(client);
  }

  removeClient(res: any) {
    this.logger.log('socket left.');
    this.clients.splice(this.clients.indexOf(res), 1);
  }

  runSimulation() {
    setInterval(() => {
      const eventData = { time: new Date().toISOString() };

      this.broadcastEvent(eventData);
    }, 1000);
  }

  async broadcastEvent(data: any) {
    const messageContent = JSON.stringify(data);
    const result = await this.redisPubClient.publish('sse-events', messageContent);
    return result;
  }
}
