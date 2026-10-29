/**
 * The envelope published to Redis and fanned out to SSE clients.
 */
export type SseEnvelope = {
  event: string;
  data: unknown;
};

export type SseEventProps = {
  /**
   * @default 'message'
   */
  event?: string;
  /**
   * Serialized with JSON.stringify, so it must be JSON-serializable.
   */
  data: unknown;
};

export type SendToUserProps = SseEventProps & {
  userId: string;
};

export type SendToTopicProps = SseEventProps & {
  /**
   * Any string, e.g. `chat:7`.
   */
  topic: string;
};

export type PublishProps = {
  channel: string;
  event: string;
  data: unknown;
};
