export type ChannelListener = (message: string) => void;

export type ChannelSubscription = {
  /**
   * The local connections (socketIds) that need this channel.
   * This node's Redis connection stays subscribed while it's non-empty.
   * Other nodes track their own connections. Redis tracks each node's subscription separately and PUBLISH reaches all of them.
   *
   * A set, not a count: releasing a socketId that isn't in it is a no-op, so a double release can't drop someone else's.
   */
  socketIds: Set<string>;
  listener: ChannelListener;
  /**
   * Set while the SUBSCRIBE is in flight,
   * so later subscribers wait for the same one.
   */
  pendingSubscription: Promise<void> | null;
};

export type SubscribeToRedisProps = {
  channelName: string;
  channel: ChannelSubscription;
};

export type SubscribeProps = {
  socketId: string;
  channelName: string;
  /**
   * Only the first subscriber's listener is registered.
   * Every subscriber of a channel must pass an equivalent one.
   */
  listener: ChannelListener;
};

export type CreateChannelProps = {
  channelName: string;
  /**
   * Only the first subscriber's listener is registered.
   * Every subscriber of a channel must pass an equivalent one.
   */
  listener: ChannelListener;
};

export type AddToSocketIndexProps = {
  socketId: string;
  channelName: string;
};

export type UnsubscribeProps = {
  socketId: string;
  channelName: string;
};

export type IsSocketSubscribedProps = {
  socketId: string;
  channelName: string;
};

export type RemoveFromSocketIndexProps = {
  socketId: string;
  channelName: string;
};

export type DropFailedSocketIdProps = AddToSocketIndexProps & {
  channel: ChannelSubscription;
};
