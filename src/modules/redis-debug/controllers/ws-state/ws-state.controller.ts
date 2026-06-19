import { API_PATHS } from '@src/common/constants';
import { internalApiKeyMiddleware } from '@src/modules/redis-debug/middleware/internal-api-key.middleware';
import type { Application, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';

export class WsStateController implements ControllerFactory {
  constructor(private readonly app: Application) {}

  registerRoutes() {
    this.wsState();
  }

  private wsState(): void {
    this.app.get(API_PATHS.internalWsState, internalApiKeyMiddleware, async (_req, res: Response) => {
      const { topicSubscriber, logger } = this.app;

      logger.debug(`GET ${API_PATHS.internalWsState} - internal ws state`);

      const [topicCount, topicNames] = await Promise.all([
        topicSubscriber.getTopicCount(),
        topicSubscriber.getTopicNames(),
      ]);

      const topicDetailsArr = await Promise.all(
        topicNames.map(async (topic) => {
          const subscriberCount = await topicSubscriber.getSubscriberCount(topic);

          return { topic, subscriberCount };
        }),
      );

      const totalSubscriptionsSum = topicDetailsArr.reduce((sum, d) => sum + d.subscriberCount, 0);

      const payload = {
        activeTopics: topicCount,
        topics: topicDetailsArr,
        totalSubscriptions: totalSubscriptionsSum,
        // totalUniqueSubscribers: totalSubscribersSum,
      };

      res.json(payload);
    });
  }
}
