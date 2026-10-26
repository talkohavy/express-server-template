export type ReleaseConnectionResourcesProps = {
  userId: string;
  socketId: string;
  /**
   * The topics whose subscriptions the connection holds.
   */
  topics: string[];
};
