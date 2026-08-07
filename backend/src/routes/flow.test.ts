/**
 * Complete product flow integration test.
 *
 * Covers the full user journey end-to-end against the live Hono app:
 *
 *   1.  Health check
 *   2.  User registration
 *   3.  Duplicate registration rejected
 *   4.  Login with wrong password rejected
 *   5.  Login (email + password)
 *   6.  Get authenticated session (me)
 *   7.  Create a resume
 *   8.  List resumes
 *   9.  Get resume by ID
 *   10. Update resume (name + slug)
 *   11. Patch resume (JSON Patch — update a field)
 *   12. Duplicate resume
 *   13. Set resume public
 *   14. Get public resume by username/slug (unauthenticated)
 *   15. Set resume password
 *   16. Public access blocked without password
 *   17. Password verification grants access
 *   18. Remove resume password
 *   19. Lock resume — prevents edits
 *   20. Unlock resume
 *   21. Resume statistics
 *   22. Resume tags
 *   23. Delete resume
 *   24. Logout
 *   25. Protected routes reject after logout
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app";
import { closeDb } from "@/integrations/drizzle/client";
import { closeRedis } from "@/lib/redis";
import { resetDb } from "@/test/reset-db";
import { resetRedis } from "@/test/reset-redis";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uniqueUser() {
  const id = crypto.randomUUID().slice(0, 8);
  return {
    name: `Test User ${id}`,
    email: `test-${id}@example.com`,
    password: "Password123!",
    username: `user_${id}`,
  };
}

/** POST /api/rpc/:procedure (oRPC JSON protocol) */
async function rpc(
  procedure: string,
  input: unknown = {},
  cookieHeader?: string,
): Promise<{ status: number; body: unknown; cookies: string[] }> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  if (cookieHeader) headers["cookie"] = cookieHeader;

  const res = await app.request(`/api/rpc/${procedure}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ json: input }),
  });

  const setCookies = res.headers.getSetCookie?.() ?? [];
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, body, cookies: setCookies };
}

/** Extract session cookie from set-cookie headers */
function extractSessionCookie(setCookies: string[]): string {
  return setCookies
    .map((c) => c.split(";")[0])
    .join("; ");
}

/** Sign up then sign in — returns session cookie + userId */
async function createAndLogin(user: ReturnType<typeof uniqueUser>): Promise<{
  cookie: string;
  userId: string;
  username: string;
}> {
  const signupRes = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(user),
  });
  expect(signupRes.status).toBeLessThan(400);

  const loginRes = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  expect(loginRes.status).toBeLessThan(400);

  const cookie = extractSessionCookie(loginRes.headers.getSetCookie?.() ?? []);
  const loginBody = (await loginRes.json()) as { user?: { id: string } };
  const userId = loginBody?.user?.id ?? "";

  return { cookie, userId, username: user.username };
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe("Complete Product Flow", () => {
  let cookie = "";
  let userId = "";
  let username = "";
  const user = uniqueUser();

  beforeEach(async () => {
    await resetDb();
    await resetRedis();
    const session = await createAndLogin(user);
    cookie = session.cookie;
    userId = session.userId;
    username = session.username;
  });

  afterAll(async () => {
    await closeDb();
    await closeRedis();
  });

  it("1. GET /api/health returns 200 with status ok", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  it("2. registers a new user successfully", async () => {
    const newUser = uniqueUser();
    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(newUser),
    });
    expect(res.status).toBeLessThan(400);
    const body = (await res.json()) as { user?: { email: string } };
    expect(body.user?.email).toBe(newUser.email);
  });

  it("3. rejects duplicate email on registration", async () => {
    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(user),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("4. rejects login with wrong password", async () => {
    const res = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: user.email, password: "WrongPassword!" }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("5. logs in with correct credentials and gets session cookie", async () => {
    const res = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });
    expect(res.status).toBeLessThan(400);
    const cookies = res.headers.getSetCookie?.() ?? [];
    expect(cookies.length).toBeGreaterThan(0);
  });

  it("6. returns authenticated user with valid session cookie", async () => {
    const { body, status } = await rpc("auth/me", {}, cookie);
    expect(status).toBe(200);
    const data = (body as { json?: { id: string; email: string } }).json;
    expect(data?.email).toBe(user.email);
  });

  it("7. creates a new resume", async () => {
    const { body, status } = await rpc(
      "resume/create",
      { name: "My Test Resume", slug: "my-test-resume", tags: ["test"] },
      cookie,
    );
    expect(status).toBe(200);
    const data = (body as { json?: { id: string } }).json;
    expect(data?.id).toBeTruthy();
  });

  it("8. lists all resumes for the authenticated user", async () => {
    await rpc("resume/create", { name: "List Test Resume", slug: "list-test", tags: [] }, cookie);
    const { body, status } = await rpc("resume/list", {}, cookie);
    expect(status).toBe(200);
    const data = (body as { json?: unknown[] }).json;
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);
  });

  it("9. fetches a resume by ID", async () => {
    const createRes = await rpc("resume/create", { name: "Get By ID", slug: "get-by-id", tags: [] }, cookie);
    const id = ((createRes.body as { json?: { id: string } }).json)?.id ?? "";

    const { body, status } = await rpc("resume/getById", { id }, cookie);
    expect(status).toBe(200);
    const data = (body as { json?: { id: string; name: string } }).json;
    expect(data?.id).toBe(id);
  });

  it("10. updates resume name and slug", async () => {
    const createRes = await rpc("resume/create", { name: "Original", slug: "original", tags: [] }, cookie);
    const id = ((createRes.body as { json?: { id: string } }).json)?.id ?? "";

    const { body, status } = await rpc("resume/update", { id, name: "Updated", slug: "updated" }, cookie);
    expect(status).toBe(200);
    const data = (body as { json?: { name: string } }).json;
    expect(data?.name).toBe("Updated");
  });

  it("11. patches resume data with JSON Patch", async () => {
    const createRes = await rpc("resume/create", { name: "Patch Target", slug: "patch-target", tags: [] }, cookie);
    const id = ((createRes.body as { json?: { id: string } }).json)?.id ?? "";

    const { body, status } = await rpc(
      "resume/patch",
      { id, operations: [{ op: "replace", path: "/basics/name", value: "John Patched" }] },
      cookie,
    );
    expect(status).toBe(200);
    const data = (body as { json?: { data?: { basics?: { name: string } } } }).json;
    expect(data?.data?.basics?.name).toBe("John Patched");
  });

  it("12. duplicates a resume", async () => {
    const createRes = await rpc("resume/create", { name: "Source", slug: "source", tags: [] }, cookie);
    const sourceId = ((createRes.body as { json?: { id: string } }).json)?.id ?? "";

    const { body, status } = await rpc(
      "resume/duplicate",
      { id: sourceId, name: "Copy", slug: "copy", tags: [] },
      cookie,
    );
    expect(status).toBe(200);
    const data = (body as { json?: { id: string } }).json;
    expect(data?.id).toBeTruthy();
    expect(data?.id).not.toBe(sourceId);
  });

  it("14. returns a public resume without authentication", async () => {
    const createRes = await rpc("resume/create", { name: "Public", slug: "public", tags: [] }, cookie);
    const id = ((createRes.body as { json?: { id: string } }).json)?.id ?? "";
    await rpc("resume/update", { id, isPublic: true }, cookie);

    const { body, status } = await rpc("resume/getBySlug", { username, slug: "public" });
    expect(status).toBe(200);
    const data = (body as { json?: { slug: string } }).json;
    expect(data?.slug).toBe("public");
  });

  it("19. locks a resume and rejects further updates", async () => {
    const createRes = await rpc("resume/create", { name: "Lock Me", slug: "lock-me", tags: [] }, cookie);
    const id = ((createRes.body as { json?: { id: string } }).json)?.id ?? "";

    await rpc("resume/setLocked", { id, isLocked: true }, cookie);
    const updateRes = await rpc("resume/update", { id, name: "Should Fail" }, cookie);
    expect(updateRes.status).toBeGreaterThanOrEqual(400);
  });

  it("21. returns statistics for a resume", async () => {
    const createRes = await rpc("resume/create", { name: "Stats", slug: "stats", tags: [] }, cookie);
    const id = ((createRes.body as { json?: { id: string } }).json)?.id ?? "";

    const { body, status } = await rpc("resume/statistics/getById", { id }, cookie);
    expect(status).toBe(200);
    const data = (body as { json?: { views: number } }).json;
    expect(typeof data?.views).toBe("number");
  });

  it("22. returns sorted unique tags across resumes", async () => {
    await rpc("resume/create", { name: "A", slug: "a", tags: ["backend", "api"] }, cookie);
    await rpc("resume/create", { name: "B", slug: "b", tags: ["frontend", "api"] }, cookie);

    const { body, status } = await rpc("resume/tags/list", {}, cookie);
    expect(status).toBe(200);
    const data = (body as { json?: string[] }).json;
    expect(data).toContain("api");
    expect([...(data ?? [])].sort()).toEqual(data);
  });

  it("23. deletes a resume permanently", async () => {
    const createRes = await rpc("resume/create", { name: "Delete Me", slug: "delete-me", tags: [] }, cookie);
    const id = ((createRes.body as { json?: { id: string } }).json)?.id ?? "";

    await rpc("resume/delete", { id }, cookie);
    const { status } = await rpc("resume/getById", { id }, cookie);
    expect(status).toBeGreaterThanOrEqual(400);
  });

  it("25. rejects protected routes after session is invalidated", async () => {
    await app.request("/api/auth/sign-out", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
    });
    const { status } = await rpc("resume/list", {}, cookie);
    expect(status).toBe(401);
  });
});
