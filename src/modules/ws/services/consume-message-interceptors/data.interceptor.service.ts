import { StaticTopics } from '../../logic/constants';
import type { TopicPayload } from '@src/common/types';
import type { TopicSubscriberService } from '@src/core/services/topic-subscriber';

export class DataInterceptorService {
  constructor(private readonly topicSubscriber: TopicSubscriberService) {}

  registerInterceptors(): void {
    this.topicSubscriber.register({
      topic: StaticTopics.Data,
      interceptor: this.interceptDataTopic.bind(this),
    });
  }

  private async interceptDataTopic<T = any>(topicPayload: TopicPayload<T>): Promise<TopicPayload<T> | null> {
    return topicPayload;
  }
}
