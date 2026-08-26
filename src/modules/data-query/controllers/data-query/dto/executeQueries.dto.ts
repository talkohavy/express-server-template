import Joi from 'joi';

/**
 * This schema validates only the generic envelope shape - it cannot know
 * per-dataset field names. Per-dataset semantic validation (unknown
 * dataset/dimension/measure/operator, role-forbidden measure) happens in
 * QueryCompilerService and is caught per-query, never here.
 */
const filterSchema = Joi.object({
  field: Joi.string().min(1).max(100).required(),
  operator: Joi.string().valid('eq', 'ne', 'in', 'notIn', 'gt', 'gte', 'lt', 'lte', 'between').required(),
  value: Joi.any().required(),
});

const sortSchema = Joi.object({
  field: Joi.string().min(1).max(100).required(),
  direction: Joi.string().valid('asc', 'desc').required(),
});

const timeRangeSchema = Joi.object({
  from: Joi.string().isoDate(),
  to: Joi.string().isoDate(),
  granularity: Joi.string().valid('day', 'week', 'month'),
});

const widgetQuerySchema = Joi.object({
  id: Joi.string().min(1).max(100).required(),
  dataset: Joi.string().min(1).max(100).required(),
  dimensions: Joi.array().items(Joi.string().min(1).max(100)).max(20),
  measures: Joi.array().items(Joi.string().min(1).max(100)).max(20),
  filters: Joi.array().items(filterSchema).max(20),
  timeRange: timeRangeSchema,
  sort: Joi.array().items(sortSchema).max(5),
  limit: Joi.number().integer().min(1).max(1000),
  offset: Joi.number().integer().min(0),
});

export const executeDataQueriesSchema = Joi.object({
  // Capped at 10 to bound the total work a single request can trigger.
  queries: Joi.array().items(widgetQuerySchema).min(1).max(10).required(),
});
