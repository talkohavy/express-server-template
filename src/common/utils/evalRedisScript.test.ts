import { createHash } from 'node:crypto';
import { evalRedisScript } from './evalRedisScript';
import type { RedisClientType } from 'redis';

const SCRIPT = "return redis.call('GET', KEYS[1])";
const SCRIPT_SHA = createHash('sha1').update(SCRIPT).digest('hex');

describe('evalRedisScript', () => {
  let redisClient: { sendCommand: jest.Mock };

  beforeEach(() => {
    redisClient = { sendCommand: jest.fn().mockResolvedValue('value') };
  });

  async function runScript() {
    const result = await evalRedisScript({
      redisClient: redisClient as unknown as RedisClientType,
      script: SCRIPT,
      keys: ['key-1'],
      args: ['arg-1', 'arg-2'],
    });

    return result;
  }

  it('should run the script by its sha', async () => {
    const expectedResult = [['EVALSHA', SCRIPT_SHA, '1', 'key-1', 'arg-1', 'arg-2']];

    await runScript();

    const actualResult = redisClient.sendCommand.mock.calls.map(([command]) => command);

    expect(actualResult).toEqual(expectedResult);
  });

  it("should return the script's result", async () => {
    const actualResult = await runScript();

    expect(actualResult).toBe('value');
  });

  it('should fall back to EVAL when Redis does not have the script cached', async () => {
    redisClient.sendCommand.mockRejectedValueOnce(new Error('NOSCRIPT No matching script.'));

    const expectedResult = ['EVAL', SCRIPT, '1', 'key-1', 'arg-1', 'arg-2'];

    await runScript();

    const [actualResult] = redisClient.sendCommand.mock.calls[1];

    expect(actualResult).toEqual(expectedResult);
  });

  it('should rethrow any other error without falling back', async () => {
    redisClient.sendCommand.mockRejectedValueOnce(new Error('connection lost'));

    await expect(runScript()).rejects.toThrow('connection lost');
    expect(redisClient.sendCommand).toHaveBeenCalledTimes(1);
  });
});
