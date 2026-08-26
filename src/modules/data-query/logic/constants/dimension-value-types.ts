export const DimensionValueTypes = {
  String: 'string',
  Number: 'number',
  Boolean: 'boolean',
  Date: 'date',
} as const;

export type DimensionValueTypeValues = (typeof DimensionValueTypes)[keyof typeof DimensionValueTypes];
