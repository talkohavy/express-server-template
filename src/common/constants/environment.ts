export const Environment = {
  Prod: 'prod',
  QA: 'qa',
  Dev: 'dev',
} as const;

type TypeOfEnvironment = typeof Environment;
export type EnvironmentKeys = keyof TypeOfEnvironment;
export type EnvironmentValues = TypeOfEnvironment[EnvironmentKeys];
