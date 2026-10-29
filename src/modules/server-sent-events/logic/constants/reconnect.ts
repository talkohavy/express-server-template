/**
 * Reconnection delay sent to clients on connect (the SSE `retry:` field).
 *
 * The field is consumed by the browser's `EventSource` class itself - it never reaches application listeners (i.e. React).
 * `EventSource` reconnects automatically whenever the stream drops (deploy, network blip, proxy timeout),
 * and waits this long before each attempt. Without it, the delay is browser-defined ("a few seconds").
 *
 * Sending it makes the delay consistent across browsers and server-controlled: the server can send a new
 * `retry:` at any time (e.g. a jittered value right before shutdown, so clients don't all reconnect at once).
 *
 * Note: auto-reconnect only covers dropped connections. If the server answers a (re)connect with a non-200
 * status or a non `text/event-stream` content type, `EventSource` gives up permanently (`readyState` is
 * `CLOSED`), and the client must create a new `EventSource` itself.
 */
export const SSE_RETRY_MS = 3000;
