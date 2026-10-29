import type { SseControlMessage } from '@src/core/services/sse-topics';

export type SubscribeToUserEventsProps = {
  userId: string;
  socketId: string;
};

export type SubscribeToUserTopicsProps = {
  userId: string;
  socketId: string;
};

export type CompleteTopicsLoadProps = {
  userId: string;
  socketId: string;
};

export type HandleUserChannelMessageProps = {
  userId: string;
  payload: string;
};

export type ForwardEnvelopeToTopicProps = {
  topic: string;
  payload: string;
};

export type HandleControlMessageProps = {
  userId: string;
  controlMessage: SseControlMessage;
};

export type ApplyControlMessageProps = {
  socketId: string;
  controlMessage: SseControlMessage;
};
