export const RequestContext = {
  Method: 'method',
  OriginalUrl: 'originalUrl',
  Url: 'url',
  Path: 'path',
  Query: 'query',
} as const;

type TypeOfRequestContext = typeof RequestContext;
export type RequestContextKeys = keyof TypeOfRequestContext;
export type RequestContextValues = TypeOfRequestContext[RequestContextKeys];
