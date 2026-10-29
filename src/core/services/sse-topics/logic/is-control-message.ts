import { isObject } from '@src/common/utils/isObject';
import { SseControlTypes, VALID_SSE_CONTROL_TYPES, type SseControlTypeValues } from './constants';
import type { SseControlMessage } from '../types';

/**
 * Tells a control message apart from a data envelope (`{ event, data }`) on the user's events channel,
 * and checks that its `props` match its control type.
 */
export function isControlMessage(parsedPayload: unknown): parsedPayload is SseControlMessage {
  if (!isObject(parsedPayload)) return false;

  const { control, props } = parsedPayload;

  if (typeof control !== 'string' || !VALID_SSE_CONTROL_TYPES.has(control)) return false;

  const validateProps = PROPS_VALIDATORS_BY_CONTROL_TYPE[control as SseControlTypeValues];

  if (!validateProps) return true;

  const isValidProps = validateProps(props);

  return isValidProps;
}

type PropsValidator = (props: unknown) => boolean;

/**
 * Validates the `props` of each control type. Typed as a full Record, so adding a control type
 * doesn't compile until its validator is added here.
 */
const PROPS_VALIDATORS_BY_CONTROL_TYPE: Partial<Record<SseControlTypeValues, PropsValidator>> = {
  [SseControlTypes.TopicJoined]: isTopicControlMessageProps,
  [SseControlTypes.TopicLeft]: isTopicControlMessageProps,
};

function isTopicControlMessageProps(props: any): boolean {
  const { topic } = props;

  return typeof topic === 'string';
}
