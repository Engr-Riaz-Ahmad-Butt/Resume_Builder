import Redis from "ioredis";

import { env } from "./env.js";
import { onShutdown } from "./shutdown.js";

declare global {
  var __backendRedis: Redis | undefined;
}

export function getRedis(): Redis {
  if (!globalThis.__backendRedis) {
    globalThis.__backendRedis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    });
    onShutdown(async () => {
      await globalThis.__backendRedis?.quit();
      globalThis.__backendRedis = undefined;
    });
  }
  return globalThis.__backendRedis;
}

export async function closeRedis(): Promise<void> {
  if (globalThis.__backendRedis) {
    await globalThis.__backendRedis.quit();
    globalThis.__backendRedis = undefined;
  }
}
