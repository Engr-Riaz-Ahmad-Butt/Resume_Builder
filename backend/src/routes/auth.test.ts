import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app";
import { closeDb } from "@/integrations/drizzle/client";
import { closeRedis } from "@/lib/redis";
import { resetDb } from "@/test/reset-db";
import { resetRedis } from "@/test/reset-redis";

function uniqueUser() {
  const id = crypto.randomUUID().slice(0, 8);
  return {
    name: `Test User ${id}`,
    email: `test-${id}@example.com`,
    password: "Password123!",
    username: `user_${id}`,
  };
}

describe("Better Auth /api/auth integration", () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await closeDb();
    await closeRedis();
  });

  it("signs up a user via email", async () => {
    const user = uniqueUser();
    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(user),
    });

    expect(res.status).toBeLessThan(500);
    // Better Auth returns 200 on success; may require username field shape
    const body = (await res.json()) as Record<string, unknown>;
    if (res.status >= 400) {
      // surface body for debugging in CI logs
      expect({ status: res.status, body }).toMatchObject({ status: 200 });
    }
    expect(body).toBeTruthy();
  });

  it("logs in after signup", async () => {
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
    const setCookie = login.headers.getSetCookie?.() ?? [];
    const cookieHeader = login.headers.get("set-cookie");
    expect(setCookie.length > 0 || Boolean(cookieHeader)).toBe(true);
  });
});
