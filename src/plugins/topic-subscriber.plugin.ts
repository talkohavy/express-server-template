import { TopicSubscriberService } from '@src/core/services/topic-subscriber';
import { WS_TOPIC_PUBSUB_CHANNEL } from '@src/modules/ws/logic/constants';
import type { Application } from 'express';

/**
 * @dependencies
 * - redis plugin
 * - logger plugin
 */
export async function topicSubscriberPlugin(app: Application) {
  app.topicSubscriber = new TopicSubscriberService(app.redis.pub, app.redis.sub, app.logger, WS_TOPIC_PUBSUB_CHANNEL);

  await app.topicSubscriber.subscribeToPubSub();
}
