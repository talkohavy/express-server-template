import { StaticTopics } from '../../../logic/constants';
import type { LoggerService } from '@src/core/services/logger';
import type { TopicSubscriberService } from '@src/core/services/topic-subscriber';
import type { WsConnectionContext, IConnectionPipeline } from '../../../types';

export class SubscribeSocketToRootTopicPipeline implements IConnectionPipeline {
  constructor(
    private readonly topicSubscriber: TopicSubscriberService,
    private readonly logger: LoggerService,
  ) {}

  async handleConnection(props: WsConnectionContext) {
    const { socket } = props;

    const isSuccess = await this.topicSubscriber.subscribe(socket, StaticTopics.Presence);

    if (!isSuccess) {
      this.logger.debug('Socket already in presence topic on connect', { socketId: socket.id });

      return;
    }

    this.logger.debug('Socket subscribed to presence', { socketId: socket.id });
  }
}
