import { afterAll, describe, expect, it } from "vitest";

import { closeDb } from "../integrations/drizzle/client.js";
import { closeRedis } from "../lib/redis.js";
import { REQUEST_ID_HEADER } from "../lib/request-id.js";
import { app } from "../app.js";

describe("GET /api/health", () => {
  afterAll(async () => {
    await closeDb();
    await closeRedis();
  });

  it("returns 200 with status ok when DB and Redis are up", async () => {
    const res = await app.request("/api/health");

    expect(res.status).toBe(200);
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy();
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");

    const body = (await res.json()) as {
      status: string;
      service: string;
      requestId: string;
      checks: { database: { status: string }; redis: { status: string } };
    };

    expect(body.status).toBe("ok");
    expect(body.service).toBe("reactive-resume-backend");
    expect(body.requestId).toBe(res.headers.get(REQUEST_ID_HEADER));
    expect(body.checks.database.status).toBe("healthy");
    expect(body.checks.redis.status).toBe("healthy");
  });

  it("propagates an incoming x-request-id", async () => {
    const res = await app.request("/api/health", {
      headers: { [REQUEST_ID_HEADER]: "test-request-id-123" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe("test-request-id-123");
  });
});
