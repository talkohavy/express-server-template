/**
 * Each script updates the user's topics set and, only if it changed, publishes a control message on the user's
 * events channel, in one atomic step. So a connection that read the set can't miss a change made after that.
 *
 * Touches one key only (the channel is not a key), so it runs on Redis Cluster too.
 *
 * KEYS[1]: the user's topics set, `sse:user:{userId}:topics`
 * ARGV[1]: the topic
 * ARGV[2]: the user's events channel, `sse:events:user:{userId}`
 * ARGV[3]: the control message (JSON)
 *
 * Returns 1 if the set changed, 0 if not.
 */
export const ADD_USER_TO_TOPIC_SCRIPT = `
  local isAdded = redis.call('SADD', KEYS[1], ARGV[1])

  if isAdded == 1 then
    redis.call('PUBLISH', ARGV[2], ARGV[3])
  end

  return isAdded
`;

/**
 * Same as {@link ADD_USER_TO_TOPIC_SCRIPT}, with SREM. Redis deletes the key when its last topic is removed.
 */
export const REMOVE_USER_FROM_TOPIC_SCRIPT = `
  local isRemoved = redis.call('SREM', KEYS[1], ARGV[1])

  if isRemoved == 1 then
    redis.call('PUBLISH', ARGV[2], ARGV[3])
  end

  return isRemoved
`;
