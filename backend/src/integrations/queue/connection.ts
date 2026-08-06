import type { ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

import { env } from "@/lib/env";

/**
 * BullMQ requires maxRetriesPerRequest: null on blocking connections.
 * Keep separate from the shared app Redis client used for cache/rate-limits.
 */
export function createQueueConnection(): IORedis {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export function queueConnectionOptions(): ConnectionOptions {
  return createQueueConnection();
}
