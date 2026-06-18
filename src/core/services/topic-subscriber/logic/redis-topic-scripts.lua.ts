/**
 * Lua scripts for atomic topic subscription operations in Redis.
 * Used by TopicManager; all mutations go through these scripts so Redis stays the source of truth.
 *
 * Key layout:
 * - ws:topic:{topic}:sockets     -> SET of socketIds subscribed to the topic
 * - ws:socket:{socketId}:topics -> SET of topics the socketId is listed to
 * - ws:topics            -> SET of topic names (for getTopicCount)
 */

/**
 * Script 1: Subscribe socketId to topic. Returns 1 if newly subscribed, 0 if already member.
 *
 * socketsUnderTopicKey: `ws:topic:${topic}:sockets`
 * topicsUnderSocketKey: `ws:socket:${socketId}:topics`
 * topicsGroupKey: 'ws:topics'
 *
 * Optional, ttl_seconds. Defaults to 3600 seconds (1 hour).
 */
export const SUBSCRIBE_SCRIPT = `
  -- Step 1: Resolve key names from KEYS (arguments passed by the script invoker).
  local socketsUnderTopicKey = KEYS[1]   -- e.g. ws:topic:[banana-topic]:sockets
  local topicsUnderSocketKey = KEYS[2]   -- e.g. ws:socket:[socketId-123]:topics
  local topicsGroupKey = KEYS[3]         -- ws:topics (global set of topic names)

  -- Step 2: Resolve arguments (socketId, topic, optional TTL in seconds).
  local socketId = ARGV[1]
  local topicName = ARGV[2]
  local ttl = tonumber(ARGV[3]) or 3600

  -- Step 3: Add the socket to the topic's subscribers set (idempotent: 1 if new, 0 if already member).
  local addedSocketId = redis.call('SADD', socketsUnderTopicKey, socketId)

  -- Step 4: Add the topic to the socket's list of topics (reverse index).
  redis.call('SADD', topicsUnderSocketKey, topicName)

  -- Step 5: Ensure the topic name exists in the global topics set (for getTopicCount / getTopicNames).
  redis.call('SADD', topicsGroupKey, topicName)

  -- Step 6: Refresh TTL on all three keys so they do not expire while in use (resilience to crashes).
  redis.call('EXPIRE', socketsUnderTopicKey, ttl)
  redis.call('EXPIRE', topicsUnderSocketKey, ttl)
  redis.call('EXPIRE', topicsGroupKey, ttl)

  -- Step 7: Return 1 if newly subscribed, 0 if already subscribed.
  return addedSocketId
`;

/**
 * Script 2: Unsubscribe socketId from topic. Returns 1 if was member, 0 otherwise.
 *
 * keys: [topicKeyStr, socketKeyStr, topicsSet]
 *
 * topicsUnderSocketKey: `ws:socket:${socketId}:topics`
 * socketsUnderTopicKey: `ws:topic:${topic}:sockets`
 * topicsGroupKey: 'ws:topics'
 *
 * Optional, ttl_seconds. Defaults to 3600 seconds (1 hour).
 */
export const UNSUBSCRIBE_SCRIPT = `
  -- Step 1: Resolve key names from KEYS (arguments passed by the script invoker).
  local socketsUnderTopicKey = KEYS[1]   -- ws:topic:{topic}:sockets
  local topicsUnderSocketKey = KEYS[2]   -- ws:socket:{socketId}:topics
  local topicsGroupKey = KEYS[3]         -- ws:topics

  -- Step 2: Resolve arguments and optional TTL.
  local socketId = ARGV[1]
  local topicName = ARGV[2]
  local ttl = tonumber(ARGV[3]) or 3600

  -- Step 3: Remove the socket from the topic's subscribers list. (1 if was member, 0 otherwise)
  local removedSocketId = redis.call('SREM', socketsUnderTopicKey, socketId)

  -- Step 4: Only update reverse index and TTLs if we actually removed the socket.
  if removedSocketId == 1 then
    -- Step 4a: Remove topic from the socket's own topics list (reverse index).
    redis.call('SREM', topicsUnderSocketKey, topicName)

    -- Step 4b: If no subscribers remain for this topic, delete the topic key and remove from global set.
    if redis.call('SCARD', socketsUnderTopicKey) == 0 then
      redis.call('DEL', socketsUnderTopicKey)
      redis.call('SREM', topicsGroupKey, topicName)
    else
      -- Step 4c: Topic still has other subscribers; refresh TTL so the key does not expire.
      redis.call('EXPIRE', socketsUnderTopicKey, ttl)
    end

    -- Step 4d: Refresh TTL on the socket's topics list and on the global topics set (if still non-empty).
    redis.call('EXPIRE', topicsUnderSocketKey, ttl)

    -- Step 4c: Refresh TTL on the global topics set only if it still has topics.
    -- If we removed every topic that exists, the set may be empty; so delete the topics group.
    if redis.call('SCARD', topicsGroupKey) == 0 then
      redis.call('DEL', topicsGroupKey)
    else
      redis.call('EXPIRE', topicsGroupKey, ttl)
    end
  end

  -- Step 5: Return 1 if was subscribed and removed, 0 if was not subscribed.
  return removedSocketId
`;

/**
 * Script 3: Unsubscribe socketId from all topics and delete socket key. Returns number of topics removed.
 *
 * topicsUnderSocketKey: `ws:socket:${socketId}:topics`
 * socketsUnderTopicKey: `ws:topic:{topic}:sockets`
 * topicsGroupKey: 'ws:topics'
 *
 * Optional, ttl_seconds. Defaults to 3600 seconds (1 hour).
 */
export const UNSUBSCRIBE_ALL_SCRIPT = `
  -- Step 1: Resolve key names.
  local topicsUnderSocketKey = KEYS[1]   -- ws:socket:{socketId}:topics
  local topicsGroupKey = KEYS[2]         -- ws:topics

  -- Step 2: Resolve arguments (socketId and optional TTL).
  local socketId = ARGV[1]
  local ttl = tonumber(ARGV[2]) or 3600

  -- Step 3: Fetch all topics this socket is subscribed to (we will remove the socket from each).
  local topicsOfSocket = redis.call('SMEMBERS', topicsUnderSocketKey)

  -- Step 4: For each topic, remove this socket from the topic's subscriber set and clean up if empty.
  for i, topic in ipairs(topicsOfSocket) do
    -- Step 4a: Build the topic's subscribers-set key.
    local socketsUnderTopicKey = 'ws:topic:' .. topic .. ':sockets'

    -- Step 4b: Remove this socket from the topic's subscribers list.
    redis.call('SREM', socketsUnderTopicKey, socketId)

    -- Step 4c: If the topic has no subscribers left, delete its key and remove the topic from the global set.
    if redis.call('SCARD', socketsUnderTopicKey) == 0 then
      redis.call('DEL', socketsUnderTopicKey)
      redis.call('SREM', topicsGroupKey, topic)
    else
      -- Step 4d: Topic still has other subscribers; refresh TTL so the key does not expire.
      redis.call('EXPIRE', socketsUnderTopicKey, ttl)
    end
  end

  -- Step 5: Refresh TTL on the global topics set only if it still has topics (other sockets may be using them).
  -- If we removed the last socket from every topic, the set may be empty; then delete it instead of refreshing.
  if redis.call('SCARD', topicsGroupKey) > 0 then
    redis.call('EXPIRE', topicsGroupKey, ttl)
  else
    redis.call('DEL', topicsGroupKey)
  end

  -- Step 6: Delete the socket's own topic set; the socket is no longer subscribed to anything.
  redis.call('DEL', topicsUnderSocketKey)

  -- Step 7: Return the number of topics the socket was removed from.
  return #topicsOfSocket
`;

/**
 * Script 4: Remove multiple connections from Redis in one round-trip.
 * KEYS[1] = topicsGroupKey (ws:topics), KEYS[2..n] = ws:socket:{socketId}:topics for each socket.
 * ARGV[1] = ttl_seconds (optional), ARGV[2..n] = socketId for each socket (same order as KEYS[2..n]).
 *
 * topicsGroupKey: 'ws:topics'
 * topicsUnderSocketKey: `ws:socket:${socketId}:topics`
 * socketsUnderTopicKey: `ws:topic:{topic}:sockets`
 */
export const CLEANUP_CONNECTIONS_SCRIPT = `
  -- Step 1: Resolve the global topics set key and the TTL argument.
  local topicsGroupKey = KEYS[1]        -- ws:topics
  local ttl = tonumber(ARGV[1]) or 3600

  -- Step 2: Iterate over each socket key (KEYS[2], KEYS[3], ...). ARGV[2], ARGV[3], ... are the socketIds.
  for i = 2, #KEYS do
    local socketId = ARGV[i]
    local topicsUnderSocketKey = KEYS[i]   -- ws:socket:{socketId}:topics

    -- Step 3: Get all topics this socket was subscribed to.
    local topicsOfSocket = redis.call('SMEMBERS', topicsUnderSocketKey)

    -- Step 4: For each topic, remove this socket from the topic's subscriber set and clean up if empty.
    for j, topic in ipairs(topicsOfSocket) do
      -- Step 4a: Build the topic's subscriber-set key.
      local socketsUnderTopicKey = 'ws:topic:' .. topic .. ':sockets'

      -- Step 4b: Remove this socket from the topic's subscriber set.
      redis.call('SREM', socketsUnderTopicKey, socketId)

      -- Step 4c: If the topic has no subscribers left, delete its key and remove the topic from the global set.
      if redis.call('SCARD', socketsUnderTopicKey) == 0 then
        redis.call('DEL', socketsUnderTopicKey)
        redis.call('SREM', topicsGroupKey, topic)
      else
        -- Step 4d: Topic still has other subscribers; refresh TTL so the key does not expire.
        redis.call('EXPIRE', socketsUnderTopicKey, ttl)
      end
    end

    -- Step 5: Delete this socket's topic set; the socket is fully removed from Redis.
    redis.call('DEL', topicsUnderSocketKey)
  end

  -- Step 6: Refresh TTL on the global topics set only if it still has topics; otherwise delete it.
  if redis.call('SCARD', topicsGroupKey) == 0 then
    redis.call('DEL', topicsGroupKey)
  else
    redis.call('EXPIRE', topicsGroupKey, ttl)
  end

  -- Step 7: Return success.
  return 1
`;
