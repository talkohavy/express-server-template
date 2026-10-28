import type { Response } from 'express';
import type { SseCloseReasonValues } from '../../logic/constants';
import type { SseConnection } from '../../types';

export type AddToUserIndexProps = {
  userId: string;
  socketId: string;
};

export type RemoveFromUserIndexProps = {
  userId: string;
  socketId: string;
};

export type AddToTopicsIndexProps = {
  socketId: string;
  topics: Set<string>;
};

export type RemoveFromTopicsIndexProps = {
  socketId: string;
  topic: string;
};

export type AddToTopicIndexProps = {
  socketId: string;
  topic: string;
};

export type RegisterConnectionProps = {
  socketId: string;
  userId: string;
  response: Response;
  /**
   * @default []
   */
  topics?: string[];
};

export type SendToConnectionProps = {
  socketId: string;
  message: string;
};

export type SendToUserProps = {
  userId: string;
  message: string;
};

export type SendToTopicProps = {
  topic: string;
  message: string;
};

export type JoinTopicProps = {
  socketId: string;
  topic: string;
};

export type LeaveTopicProps = {
  socketId: string;
  topic: string;
};

export type StartHoldingControlMessagesProps = {
  userId: string;
  socketId: string;
};

export type StopHoldingControlMessagesProps = {
  userId: string;
  socketId: string;
};

export type SubscribeToTopicEventsProps = {
  socketId: string;
  topic: string;
};

export type AddTopicProps = {
  socketId: string;
  topic: string;
};

export type RemoveTopicProps = {
  socketId: string;
  topic: string;
};

export type WriteProps = {
  connection: SseConnection;
  message: string;
};

export type DestroyConnectionProps = {
  connection: SseConnection;
  reason: SseCloseReasonValues;
};
