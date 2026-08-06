import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app";
import { closeDb } from "@/integrations/drizzle/client";
import { closeRedis } from "@/lib/redis";
import { resetDb } from "@/test/reset-db";

function uniqueUser() {
  const id = crypto.randomUUID().slice(0, 8);
  return {
    name: `Jwt User ${id}`,
    email: `jwt-${id}@example.com`,
    password: "Password123!",
    username: `jwt_${id}`,
  };
}

function cookieHeaderFromResponse(res: Response): string {
  const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  if (cookies.length > 0) return cookies.map((c) => c.split(";")[0]!).join("; ");
  const single = res.headers.get("set-cookie");
  return single ? single.split(",")[0]!.split(";")[0]! : "";
}

describe("JWT bearer + CORS", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
    await closeRedis();
  });

  it("responds to CORS preflight from FRONTEND_ORIGIN", async () => {
    const res = await app.request("/api/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://127.0.0.1:3000",
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:3000");
  });

  it("login → JWT → authenticated oRPC me", async () => {
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
    expect(cookie).toBeTruthy();

    // Obtain user JWT via session cookie → /api/auth/token (jwt plugin)
    const sessionRes = await app.request("/api/auth/get-session", {
      method: "GET",
      headers: { cookie, accept: "application/json" },
    });
    let jwt = sessionRes.headers.get("set-auth-jwt") || "";

    if (!jwt) {
      const tokenRes = await app.request("/api/auth/token", {
        method: "GET",
        headers: { cookie, accept: "application/json" },
      });
      expect(tokenRes.status).toBeLessThan(400);
      const body = (await tokenRes.json()) as { token?: string };
      jwt = body.token ?? "";
    }

    expect(jwt.length).toBeGreaterThan(10);

    const me = await app.request("/api/rpc/auth/me", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({}),
    });

    expect(me.status).toBe(200);
    const body = (await me.json()) as { email?: string; json?: { email?: string } };
    const email = body.email ?? body.json?.email;
    expect(email).toBe(user.email);
  });
});
