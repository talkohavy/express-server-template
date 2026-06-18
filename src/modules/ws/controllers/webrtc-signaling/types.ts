import type { ClientMessage } from '@src/common/types';

export type WebRtcSignalingPayload = {
  sessionId: string;
} & (
  | { type: 'sender' }
  | { type: 'receiver' }
  | { type: 'createOffer'; sdp: any }
  | { type: 'createAnswer'; sdp: any }
  | { type: 'iceCandidate'; candidate: any }
);

export type WebRtcSignalingMessage = Required<ClientMessage<WebRtcSignalingPayload>>;
