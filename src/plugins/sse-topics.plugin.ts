import { SseTopicsService } from '@src/core/services/sse-topics';
import type { Application } from 'express';

/**
 * Lets any module record which topics a user is in with `app.sseTopics`, even on a server that doesn't run the SSE module.
 *
 * @dependencies
 * - redis plugin
 */
export async function sseTopicsPlugin(app: Application) {
  app.sseTopics = new SseTopicsService(app.redis.pub);
}
