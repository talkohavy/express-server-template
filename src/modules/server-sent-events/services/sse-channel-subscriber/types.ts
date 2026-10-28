export type ChannelListener = (message: string) => void;

export type ChannelSubscription = {
  /**
   * The local connections (socketIds) that need this channel.
   * This node's Redis connection stays subscribed while it's non-empty.
   * Other nodes keep their own holders. Redis tracks each node's subscription separately and PUBLISH reaches all of them.
   *
   * A set, not a count: releasing a holder that isn't in it is a no-op, so a double release can't drop someone else's.
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
  listener: ChannelListener;
};

export type SubscribeProps = {
  socketId: string;
  channelName: string;
  /**
   * Only the first subscriber's listener is registered.
   * Every subscriber of a channel must pass an equivalent one.
   * Must be a new function on every call (e.g. an inline arrow function), never a shared one:
   * a failed subscription identifies itself by its listener, so it can't remove a newer subscription of the same channel.
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
