import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app";
import { closeDb } from "@/integrations/drizzle/client";
import {
  closePingQueueResources,
  enqueuePing,
  startPingWorker,
  waitForPingJob,
} from "@/integrations/queue/ping";
import { closeRedis } from "@/lib/redis";
import { resetDb } from "@/test/reset-db";
import { resetRedis } from "@/test/reset-redis";

function uniqueUser() {
  const id = crypto.randomUUID().slice(0, 8);
  return {
    name: `Queue User ${id}`,
    email: `queue-${id}@example.com`,
    password: "Password123!",
    username: `queue_${id}`,
  };
}

function cookieHeaderFromResponse(res: Response): string {
  const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  if (cookies.length > 0) return cookies.map((c) => c.split(";")[0]!).join("; ");
  const single = res.headers.get("set-cookie");
  return single ? single.split(",")[0]!.split(";")[0]! : "";
}

describe("BullMQ ping queue", () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await closePingQueueResources();
    await closeDb();
    await closeRedis();
  });

  it("enqueue → worker → DB write", async () => {
    startPingWorker();
    const message = `ping-${crypto.randomUUID()}`;
    const { jobId } = await enqueuePing(message);
    const row = await waitForPingJob(jobId);
    expect(row.message).toBe(message);
    expect(row.id).toBeTruthy();
  });

  it("protected oRPC enqueuePing requires auth and enqueues", async () => {
    const user = uniqueUser();
    const signup = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(user),
    });
    expect(signup.status).toBeLessThan(400);

    const login = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });
    expect(login.status).toBeLessThan(400);
    const cookie = cookieHeaderFromResponse(login) || cookieHeaderFromResponse(signup);

    const unauthorized = await app.request("/api/rpc/queue/enqueuePing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ json: { message: "nope" } }),
    });
    expect(unauthorized.status).toBe(401);

    startPingWorker();
    const message = `rpc-ping-${crypto.randomUUID()}`;
    const res = await app.request("/api/rpc/queue/enqueuePing", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({ json: { message } }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { jobId?: string; json?: { jobId?: string } };
    const jobId = body.jobId ?? body.json?.jobId;
    expect(jobId).toBeTruthy();
    const row = await waitForPingJob(jobId!);
    expect(row.message).toBe(message);
  });
});
