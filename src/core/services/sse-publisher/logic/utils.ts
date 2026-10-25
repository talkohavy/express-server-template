import { SSE_USER_EVENTS_CHANNEL_PREFIX } from './constants';

export function getUserEventsChannel(userId: string): string {
  return `${SSE_USER_EVENTS_CHANNEL_PREFIX}${userId}`;
}
