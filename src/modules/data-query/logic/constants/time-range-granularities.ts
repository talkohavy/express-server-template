export const TimeRangeGranularities = {
  Day: 'day',
  Week: 'week',
  Month: 'month',
} as const;

export type TimeRangeGranularityValues = (typeof TimeRangeGranularities)[keyof typeof TimeRangeGranularities];
