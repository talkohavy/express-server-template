import { SsePublisherService } from '@src/core/services/sse-publisher';
import type { Application } from 'express';

/**
 * Lets any module send SSE events with `app.ssePublisher`, even on a server that doesn't run the SSE module.
 *
 * @dependencies
 * - redis plugin
 */
export async function ssePublisherPlugin(app: Application) {
  app.ssePublisher = new SsePublisherService(app.redis.pub);
}
