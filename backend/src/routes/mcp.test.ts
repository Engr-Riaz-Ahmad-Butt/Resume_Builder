import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app";
import { auth } from "@/integrations/auth/config";
import { closeDb } from "@/integrations/drizzle/client";
import { closeRedis } from "@/lib/redis";
import { resetDb } from "@/test/reset-db";

function uniqueUser() {
  const id = crypto.randomUUID().slice(0, 8);
  return {
    name: `Mcp User ${id}`,
    email: `mcp-${id}@example.com`,
    password: "Password123!",
    username: `mcp_${id}`,
  };
}

function cookieHeaderFromResponse(res: Response): string {
  const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  if (cookies.length > 0) return cookies.map((c) => c.split(";")[0]!).join("; ");
  const single = res.headers.get("set-cookie");
  return single ? single.split(",")[0]!.split(";")[0]! : "";
}

describe("MCP + well-known", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
    await closeRedis();
  });

  it("rejects unauthenticated MCP requests with WWW-Authenticate", async () => {
    const res = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test", version: "0.0.0" },
        },
      }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: { message?: string }; jsonrpc?: string };
    expect(body.jsonrpc).toBe("2.0");
    expect(body.error?.message).toBe("Unauthorized");
    expect(res.headers.get("www-authenticate") ?? "").toContain("oauth-protected-resource");
  });

  it("serves oauth-protected-resource and server-card metadata", async () => {
    const protectedRes = await app.request("/.well-known/oauth-protected-resource");
    expect(protectedRes.status).toBe(200);
    const protectedBody = (await protectedRes.json()) as {
      resource?: string;
      authorization_servers?: string[];
    };
    expect(protectedBody.resource).toBeTruthy();
    expect(protectedBody.authorization_servers?.length).toBeGreaterThan(0);

    const cardRes = await app.request("/.well-known/mcp/server-card.json");
    expect(cardRes.status).toBe(200);
    const card = (await cardRes.json()) as { serverInfo?: { name?: string } };
    expect(card.serverInfo?.name).toBe("reactive-resume");
  });

  it("authenticates MCP initialize via x-api-key", async () => {
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

    const created = await auth.api.createApiKey({
      body: { name: "mcp-test-key", prefix: "mcp" },
      headers: new Headers({ cookie }),
    });
    const apiKey = (created as { key?: string }).key;
    expect(apiKey).toBeTruthy();

    const res = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "x-api-key": apiKey!,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test", version: "0.0.0" },
        },
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result?: { serverInfo?: { name?: string } };
      error?: unknown;
    };
    expect(body.error).toBeUndefined();
    expect(body.result?.serverInfo?.name).toBe("reactive-resume");
  });
});
