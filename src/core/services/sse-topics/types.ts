import type { SseControlTypeValues } from './logic/constants';

export type UserTopicProps = {
  userId: string;
  /**
   * Any string, e.g. `chat:7`.
   */
  topic: string;
};

export type SseControlMessage = {
  control: SseControlTypeValues;
  topic: string;
};
