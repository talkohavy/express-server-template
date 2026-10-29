import { SSE_HEARTBEAT_INTERVAL_MS } from './heartbeat';

/**
 * Max open connections per user across the whole cluster.
 */
export const SSE_MAX_CONNECTIONS_PER_USER = 10;

/**
 * Max open SSE connections on a single node (process), regardless of user.
 * Every connection holds a socket, and write buffers for hours, so a node must cap them to stay healthy.
 * A rejected client should reconnect, and the load balancer can route it to another node.
 *
 * ## **Choosing the number**
 *
 * 10k is a conservative default, not a measured value. At 10k per pod, 1M connections need 100 pods.
 * A tuned Node process typically holds 30k-100k mostly idle SSE connections, i.e. ~10-30 pods for 1M.
 *
 * What actually limits a pod:
 * 1. Memory: ~20-50KB per idle connection. Worst case is connections x SSE_MAX_BUFFERED_BYTES,
 *    so lower the buffer cap when raising this one.
 * 2. Event-loop time: a heartbeat writes once per connection. At this cap that stays cheap (one pass every 25s).
 *    Sends to a user or a topic touch far fewer connections.
 *
 * Bigger isn't always better: when a pod dies or restarts, all its clients reconnect onto other live pods at once.
 * 20k-50k per pod keeps that reconnect storm manageable.
 *
 * To pick the real number: load-test one pod (idle connections + heartbeats and targeted sends at the expected rate),
 * watch memory and event-loop delay, and set the cap at ~70% of where they degrade.
 * Autoscale on connection count, not CPU (idle SSE pods use almost no CPU).
 */
export const SSE_MAX_CONNECTIONS_PER_NODE = 10_000;

/**
 * How long a connection's lease in Redis stays valid without a refresh.
 * Leases are refreshed on every heartbeat, so a live connection survives 3 missed refreshes.
 * When a node crashes, its leases stop being refreshed and free up after this long.
 */
export const SSE_CONNECTION_LEASE_TTL_MS = SSE_HEARTBEAT_INTERVAL_MS * 4;
