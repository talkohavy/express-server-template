export type BroadcastProps = {
  /**
   * @default 'message'
   */
  event?: string;
  data: unknown;
};

export type ForwardEnvelopeToUserProps = {
  userId: string;
  payload: string;
};
