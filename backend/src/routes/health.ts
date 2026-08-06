import { sql } from "drizzle-orm";
import { Hono } from "hono";

import { getDb } from "../integrations/drizzle/client.js";
import { getRedis } from "../lib/redis.js";
import type { RequestIdVariables } from "../middleware/request-id.js";

type Check = {
  status: "healthy" | "unhealthy";
  latencyMs: number;
  error?: string;
};

async function timedCheck(fn: () => Promise<void>): Promise<Check> {
  const started = Date.now();
  try {
    await fn();
    return { status: "healthy", latencyMs: Date.now() - started };
  } catch (err) {
    return {
      status: "unhealthy",
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const healthRoutes = new Hono<{ Variables: RequestIdVariables }>().get(
  "/api/health",
  async (c) => {
    const database = await timedCheck(async () => {
      await getDb().execute(sql`SELECT 1`);
    });
    const redis = await timedCheck(async () => {
      const pong = await getRedis().ping();
      if (pong !== "PONG") throw new Error(`unexpected ping response: ${pong}`);
    });

    const status =
      database.status === "unhealthy" || redis.status === "unhealthy" ? "unhealthy" : "ok";

    return c.json(
      {
        status,
        service: "reactive-resume-backend",
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
        checks: { database, redis },
      },
      status === "ok" ? 200 : 503,
    );
  },
);
