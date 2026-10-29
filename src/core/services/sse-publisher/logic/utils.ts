import { SSE_TOPIC_EVENTS_CHANNEL_PREFIX, SSE_USER_EVENTS_CHANNEL_PREFIX } from './constants';

export function getUserEventsChannel(userId: string): string {
  return `${SSE_USER_EVENTS_CHANNEL_PREFIX}${userId}`;
}

export function getTopicEventsChannel(topic: string): string {
  return `${SSE_TOPIC_EVENTS_CHANNEL_PREFIX}${topic}`;
}
