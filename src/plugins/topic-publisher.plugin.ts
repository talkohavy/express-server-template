import { TopicPublisherService } from '@src/core/services/topic-publisher';
import { WS_TOPIC_PUBSUB_CHANNEL } from '@src/modules/ws/logic/constants';
import type { Application } from 'express';

/**
 * @dependencies
 * - redis plugin
 */
export async function topicPublisherPlugin(app: Application) {
  app.topicPublisher = new TopicPublisherService(app.redis.pub, WS_TOPIC_PUBSUB_CHANNEL);
}
