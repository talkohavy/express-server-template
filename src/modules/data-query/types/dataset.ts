import type { RoleTypeValues } from '@src/common/constants';
import type { DimensionValueTypeValues, MeasureAggregationValues } from '../logic/constants';
import type { Database } from './database';

export type DimensionDefinition = {
  label: string;
  /** Qualified column reference, e.g. "orders.status" */
  column: string;
  type: DimensionValueTypeValues;
};

export type MeasureDefinition = {
  label: string;
  /** Qualified column reference, e.g. "orders.total_amount_cents" */
  column: string;
  aggregation: MeasureAggregationValues;
  /** Minimum role required to select this measure. Omit for no restriction. */
  minRole?: RoleTypeValues;
};

export type DatasetJoin = {
  table: keyof Database;
  /** Qualified column on the already-joined side, e.g. "orders.user_id" */
  leftColumn: string;
  /** Qualified column on the newly-joined table, e.g. "users.id" */
  rightColumn: string;
};

export type DatasetDefinition = {
  name: string;
  table: keyof Database;
  joins?: DatasetJoin[];
  dimensions: Record<string, DimensionDefinition>;
  measures: Record<string, MeasureDefinition>;
  /** Qualified column usable for timeRange filtering + granularity bucketing */
  timeField?: string;
  maxLimit: number;
  /** Arbitrary cost-scoring budget, see logic/costEstimator.ts */
  costBudget: number;
};

export type PublicFieldSchema = {
  label: string;
  type?: DimensionValueTypeValues;
  aggregation?: MeasureAggregationValues;
};

export type PublicDatasetSchema = {
  name: string;
  dimensions: Record<string, PublicFieldSchema>;
  measures: Record<string, PublicFieldSchema>;
  maxLimit: number;
};
