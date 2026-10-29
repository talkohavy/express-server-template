import { isObject } from '@src/common/utils/isObject';
import { parseJson } from '@src/common/utils/parseJson';
import { SSE_EVENTS_CHANNEL, SSE_SIMULATION_INTERVAL_MS, SseEventNames } from '../../logic/constants';
import { formatSseMessage } from '../../logic/utils/format-sse-message';
import type { RedisClientType } from 'redis';
import type { LoggerService } from '@src/core/services/logger';
import type { SseEnvelope } from '../../types';
import type { SseConnectionsService } from '../sse-connections';
import type { BroadcastProps } from './types';

/**
 * Bridges Redis pub/sub and this node's SSE connections.
 * Every node subscribes to the same channel, so a message published from any node reaches every client.
 */
export class ServerSentEventsService {
  private simulationInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly logger: LoggerService,
    private readonly sseConnectionsService: SseConnectionsService,
    private readonly redisPubClient: RedisClientType,
    private readonly redisSubClient: RedisClientType,
  ) {}

  async subscribeToEvents(): Promise<void> {
    await this.redisSubClient.subscribe(SSE_EVENTS_CHANNEL, this.forwardEnvelopeToAllConnections.bind(this));

    this.logger.info(`Subscribed to Redis pub/sub channel: ${SSE_EVENTS_CHANNEL}`);
  }

  /**
   * @returns The number of Redis subscribers (nodes) that received the message.
   */
  async broadcast(props: BroadcastProps): Promise<number> {
    const { event = SseEventNames.Message, data } = props;

    const envelope: SseEnvelope = { event, data };
    const envelopeStringified = JSON.stringify(envelope);

    const subscribersCount = await this.redisPubClient.publish(SSE_EVENTS_CHANNEL, envelopeStringified);

    return subscribersCount;
  }

  /**
   * Dev-only helper: broadcasts the current time every second.
   */
  startSimulation(): void {
    if (this.simulationInterval) return;

    this.simulationInterval = setInterval(async () => {
      try {
        await this.broadcast({ data: { time: new Date().toISOString() } });
      } catch (error) {
        this.logger.error('SSE simulation failed to broadcast', { error });
      }
    }, SSE_SIMULATION_INTERVAL_MS);
  }

  stopSimulation(): void {
    if (!this.simulationInterval) return;

    clearInterval(this.simulationInterval);

    this.simulationInterval = null;
  }

  private forwardEnvelopeToAllConnections(payload: string): void {
    const envelope = parseJson<SseEnvelope>(payload);

    if (!this.isValidEnvelope(envelope)) {
      this.logger.error('SSE pub/sub: invalid envelope received', { channel: SSE_EVENTS_CHANNEL });

      return;
    }

    const { event, data } = envelope;

    const dataStringified = JSON.stringify(data);
    const message = formatSseMessage({ event, data: dataStringified });

    this.sseConnectionsService.sendToAll(message);
  }

  private isValidEnvelope(envelope: unknown): envelope is SseEnvelope {
    if (!isObject(envelope)) return false;

    const { event } = envelope;

    return typeof event === 'string' && event.length > 0 && 'data' in envelope;
  }
}
