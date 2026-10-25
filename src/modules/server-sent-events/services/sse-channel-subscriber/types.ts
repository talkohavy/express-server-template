export type ChannelListener = (message: string) => void;

export type ChannelSubscription = {
  /**
   * How many connections on this node need this channel.
   * This node's Redis connection stays subscribed while it's above 0.
   * Other nodes keep their own counts. Redis tracks each node's subscription separately and PUBLISH reaches all of them.
   */
  subscribersCount: number;
  listener: ChannelListener;
  /**
   * Set while the SUBSCRIBE is in flight,
   * so later subscribers wait for the same one.
   */
  pendingSubscription: Promise<void> | null;
};

export type ChannelSubscriptionProps = {
  channel: string;
  subscription: ChannelSubscription;
};

export type SubscribeToChannelProps = {
  channel: string;
  /**
   * Only the first subscriber's listener is registered.
   * Every subscriber of a channel must pass an equivalent one.
   */
  listener: ChannelListener;
};
