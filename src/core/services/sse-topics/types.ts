import type { SseControlTypes, SseControlTypeValues } from './logic/constants';

export type UserSessionProps = {
  userId: string;
  /**
   * The login session (the access token's `sid` claim).
   */
  sessionId: string;
};

export type UserTopicProps = {
  userId: string;
  /**
   * Any string, e.g. `chat:7`.
   */
  topic: string;
};

/**
 * The shape every control message shares. A control's own data always goes under `props`, never at the top level,
 * so adding a control type never changes how messages are told apart from data envelopes (`{ event, data }`).
 *
 * Each control type gets its own message type below, which narrows `control` and `props`,
 * and is added to the {@link SseControlMessage} union.
 */
export type SseControlMessageBase = {
  control: SseControlTypeValues;
  props?: Record<any, any>;
};

export type SseTopicControlMessage = SseControlMessageBase & {
  control: typeof SseControlTypes.TopicJoined | typeof SseControlTypes.TopicLeft;
  props: {
    /**
     * Any string, e.g. `chat:7`.
     */
    topic: string;
  };
};

export type SseSessionEndedControlMessage = SseControlMessageBase & {
  control: typeof SseControlTypes.SessionEnded;
  props: {
    /**
     * The login session that ended (the access token's `sid` claim).
     */
    sessionId: string;
  };
};

export type SseControlMessage = SseTopicControlMessage | SseSessionEndedControlMessage;
