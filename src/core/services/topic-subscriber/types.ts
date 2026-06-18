import type { TopicPayload } from '@src/common/types';

export type ServerSocketResponse = {
  type: string;
  message?: string;
};

export type InterceptorFunc = (message: TopicPayload) => unknown;

export type RegisterInterceptorProps = {
  topic: string;
  interceptor: InterceptorFunc;
};
