import { getRedis } from "../lib/redis.js";

/**
 * FLUSHDB on the configured Redis connection.
 *
 * LOCKED isolation strategy (plan M02): tests must use an isolated Redis DB index
 * (e.g. `REDIS_URL=.../15`). Call from `beforeEach` when the suite touches Redis.
 */
export async function resetRedis(): Promise<void> {
  const redis = getRedis();
  await redis.flushdb();
}
