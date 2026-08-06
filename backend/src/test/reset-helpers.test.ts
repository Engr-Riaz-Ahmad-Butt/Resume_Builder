import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../integrations/drizzle/client.js";
import { closeRedis, getRedis } from "../lib/redis.js";
import { resetDb } from "./reset-db.js";
import { resetRedis } from "./reset-redis.js";

describe("test isolation helpers", () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await closeDb();
    await closeRedis();
  });

  it("resetDb runs against an empty migrated database", async () => {
    await expect(resetDb()).resolves.toBeUndefined();
    const result = await getDb().execute(sql`SELECT 1::int AS ok`);
    const rows = result.rows as Array<{ ok: number }>;
    expect(rows[0]?.ok).toBe(1);
  });

  it("resetRedis FLUSHDB leaves the dedicated DB empty", async () => {
    const redis = getRedis();
    await redis.set("m02-smoke", "1");
    expect(await redis.get("m02-smoke")).toBe("1");
    await resetRedis();
    expect(await redis.get("m02-smoke")).toBeNull();
  });
});
