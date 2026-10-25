/**
 * Script 1: Acquire a lease for a new connection, unless the user is already at the limit.
 * Returns 1 if acquired, 0 if the user is at the limit.
 *
 * KEYS[1] = userConnectionsKey (sse:user:{userId}:connections)
 * ARGV[1] = socketId
 * ARGV[2] = leaseTtlMs
 * ARGV[3] = maxConnections
 */
export const ACQUIRE_LEASE_SCRIPT = `
  -- Step 1: Resolve key and arguments.
  local userConnectionsKey = KEYS[1]
  local socketId = ARGV[1]
  local leaseTtlMs = tonumber(ARGV[2])
  local maxConnections = tonumber(ARGV[3])

  -- Step 2: Read the time from Redis.
  local time = redis.call('TIME')
  local nowMs = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)

  -- Step 3: Prune leases that were not refreshed in time (e.g. their node crashed).
  redis.call('ZREMRANGEBYSCORE', userConnectionsKey, '-inf', nowMs)

  -- Step 4: Reject if the user is already at the limit. Check and add run atomically, so two nodes can't both take the last slot.
  if redis.call('ZCARD', userConnectionsKey) >= maxConnections then
    return 0
  end

  -- Step 5: Add the lease, and let the whole key expire if no lease is ever refreshed again.
  redis.call('ZADD', userConnectionsKey, nowMs + leaseTtlMs, socketId)
  redis.call('PEXPIRE', userConnectionsKey, leaseTtlMs)

  return 1
`;

/**
 * Script 2: Extend the leases of a user's live connections on this node.
 * Returns the number of leases extended.
 *
 * Uses ZADD XX (update only): a connection that closed and released its lease while this refresh was in flight
 * must not get its lease back.
 *
 * KEYS[1] = userConnectionsKey (sse:user:{userId}:connections)
 * ARGV[1] = leaseTtlMs
 * ARGV[2..n] = socketIds
 */
export const REFRESH_LEASES_SCRIPT = `
  -- Step 1: Resolve key and arguments.
  local userConnectionsKey = KEYS[1]
  local leaseTtlMs = tonumber(ARGV[1])

  -- Step 2: Read the time from Redis.
  local time = redis.call('TIME')
  local expiresAtMs = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000) + leaseTtlMs

  -- Step 3: Extend every lease that still exists.
  local refreshedCount = 0
  for i = 2, #ARGV do
    refreshedCount = refreshedCount + redis.call('ZADD', userConnectionsKey, 'XX', 'CH', expiresAtMs, ARGV[i])
  end

  -- Step 4: Extend the key itself. A no-op if every lease is already gone.
  redis.call('PEXPIRE', userConnectionsKey, leaseTtlMs)

  return refreshedCount
`;
