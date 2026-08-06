import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "../../lib/env.js";
import { onShutdown } from "../../lib/shutdown.js";

import * as schema from "./schema.js";

declare global {
  var __backendPool: Pool | undefined;
  var __backendDrizzle: NodePgDatabase<typeof schema> | undefined;
}

function getPool(): Pool {
  if (!globalThis.__backendPool) {
    globalThis.__backendPool = new Pool({ connectionString: env.DATABASE_URL });
    onShutdown(async () => {
      await globalThis.__backendPool?.end();
      globalThis.__backendPool = undefined;
      globalThis.__backendDrizzle = undefined;
    });
  }
  return globalThis.__backendPool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!globalThis.__backendDrizzle) {
    globalThis.__backendDrizzle = drizzle({ client: getPool(), schema });
  }
  return globalThis.__backendDrizzle;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export async function closeDb(): Promise<void> {
  if (globalThis.__backendPool) {
    await globalThis.__backendPool.end();
    globalThis.__backendPool = undefined;
    globalThis.__backendDrizzle = undefined;
  }
}

export { schema };
