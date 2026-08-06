import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app";
import { closeDb } from "@/integrations/drizzle/client";
import { closeRedis } from "@/lib/redis";
import { resetDb } from "@/test/reset-db";

describe("oRPC shell", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
    await closeRedis();
  });

  it("public ping succeeds without auth", async () => {
    const res = await app.request("/api/rpc/auth/ping", {
      method: "GET",
      headers: { accept: "application/json" },
    });
    expect(res.status).toBe(200);
  });

  it("protected me without auth returns UNAUTHORIZED", async () => {
    const res = await app.request("/api/rpc/auth/me", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(401);
    const bodyText = await res.text();
    expect(bodyText.toLowerCase()).toMatch(/unauthorized/);
  });
});
