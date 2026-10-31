export type TopicBody = {
  /**
   * Any string, e.g. `chat:7`.
   */
  topic: string;
};

export type SendToTopicBody = TopicBody & {
  text: string;
};

export type SendToUserBody = {
  userId: string;
  text: string;
};

/**
 * The `data` of a `topic-message` event.
 */
export type TopicMessageData = {
  topic: string;
  text: string;
  fromUserId: string;
  /**
   * ms since the epoch.
   */
  sentAt: number;
};

/**
 * The `data` of a `user-message` event.
 */
export type UserMessageData = {
  text: string;
  fromUserId: string;
  /**
   * ms since the epoch.
   */
  sentAt: number;
};
