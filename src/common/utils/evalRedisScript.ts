import { createHash } from 'node:crypto';
import type { RedisClientType } from 'redis';

const NO_SCRIPT_ERROR_PREFIX = 'NOSCRIPT';

const scriptShas = new Map<string, string>();

type EvalRedisScriptProps = {
  redisClient: RedisClientType;
  script: string;
  keys: string[];
  args: string[];
};

/**
 * Runs a Lua script by its SHA1 (EVALSHA), so the script body isn't sent to Redis on every call.
 *
 * Falls back to EVAL on NOSCRIPT (the first run, or after a Redis restart / SCRIPT FLUSH / failover),
 * which also caches the script on that Redis server for the next EVALSHA.
 */
export async function evalRedisScript(props: EvalRedisScriptProps): Promise<unknown> {
  const { redisClient, script, keys, args } = props;

  const scriptSha = getScriptSha(script);
  const keysAndArgs = [String(keys.length), ...keys, ...args];

  try {
    const result = await redisClient.sendCommand(['EVALSHA', scriptSha, ...keysAndArgs]);

    return result;
  } catch (error) {
    if (!isNoScriptError(error)) throw error;

    const result = await redisClient.sendCommand(['EVAL', script, ...keysAndArgs]);

    return result;
  }
}

function getScriptSha(script: string): string {
  const cachedScriptSha = scriptShas.get(script);

  if (cachedScriptSha) return cachedScriptSha;

  const scriptSha = createHash('sha1').update(script).digest('hex');

  scriptShas.set(script, scriptSha);

  return scriptSha;
}

function isNoScriptError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(NO_SCRIPT_ERROR_PREFIX);
}
