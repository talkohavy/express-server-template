import { RequestContext } from '@src/core/services/call-context';

export const Context = {
  ...RequestContext,
  RequestId: 'requestId',
} as const;

type TypeOfContext = typeof Context;
export type ContextKeys = keyof TypeOfContext;
export type ContextValues = TypeOfContext[ContextKeys];
