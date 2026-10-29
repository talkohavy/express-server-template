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
 * ARGV[4]: the max topics per user
 *
 * Returns 1 if the set changed, 0 if the user was already in the topic, -1 if the user is at the topics limit.
 */
export const ADD_USER_TO_TOPIC_SCRIPT = `
  local userTopicsKey = KEYS[1]
  local topic = ARGV[1]
  local maxTopics = tonumber(ARGV[4])

  local isAlreadyInTopic = redis.call('SISMEMBER', userTopicsKey, topic) == 1

  if isAlreadyInTopic then
    return 0
  end

  local userTopicsCount = redis.call('SCARD', userTopicsKey)

  if userTopicsCount >= maxTopics then
    return -1
  end

  redis.call('SADD', userTopicsKey, topic)
  redis.call('PUBLISH', ARGV[2], ARGV[3])

  return 1
`;

/**
 * Same as {@link ADD_USER_TO_TOPIC_SCRIPT}, with SREM and no limit. Redis deletes the key when its last topic is removed.
 */
export const REMOVE_USER_FROM_TOPIC_SCRIPT = `
  local isRemoved = redis.call('SREM', KEYS[1], ARGV[1])

  if isRemoved == 1 then
    redis.call('PUBLISH', ARGV[2], ARGV[3])
  end

  return isRemoved
`;
