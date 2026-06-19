import type { DragonElementValues } from '../../logic/constants';

export type CreateDragonDto = {
  name: string;
  element: DragonElementValues;
  wingSpan: number;
  age: number;
};

export type UpdateDragonDto = {
  name?: string;
  element?: DragonElementValues;
  wingSpan?: number;
  age?: number;
};
