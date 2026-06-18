import { TOPICS_GROUP_KEY } from './constants';

export function getSocketsUnderTopicKey(topic: string): string {
  return `ws:topic:${topic}:sockets`;
}

export function getTopicsUnderSocketKey(socketId: string): string {
  return `ws:socket:${socketId}:topics`;
}

export function getTopicsGroupKey(): string {
  return TOPICS_GROUP_KEY;
}
