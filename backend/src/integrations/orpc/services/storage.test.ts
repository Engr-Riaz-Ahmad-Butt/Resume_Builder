import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";

import { app } from "@/app";
import { closeDb, db } from "@/integrations/drizzle/client";
import { schema } from "@/integrations/drizzle";
import { getStorageService, uploadFile } from "@/integrations/orpc/services/storage";
import { closeRedis } from "@/lib/redis";
import { resetDb } from "@/test/reset-db";
import { eq } from "drizzle-orm";

function uniqueUser() {
  const id = crypto.randomUUID().slice(0, 8);
  return {
    name: `Storage User ${id}`,
    email: `storage-${id}@example.com`,
    password: "Password123!",
    username: `storage_${id}`,
  };
}

describe("storage upload/get integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
    await closeRedis();
    // cleanup local test uploads under backend/data
    await rm(join(process.cwd(), "data", "uploads"), { recursive: true, force: true }).catch(
      () => undefined,
    );
  });

  it("uploads a file and serves it via GET /uploads", async () => {
    const userInput = uniqueUser();
    const signup = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(userInput),
    });
    expect(signup.status).toBeLessThan(400);

    const [dbUser] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, userInput.email))
      .limit(1);
    expect(dbUser).toBeTruthy();

    const payload = new TextEncoder().encode("hello-storage");
    const uploaded = await uploadFile({
      userId: dbUser!.id,
      data: payload,
      contentType: "text/plain",
      type: "picture",
    });

    expect(uploaded.key.startsWith(`uploads/${dbUser!.id}/`)).toBe(true);

    const readBack = await getStorageService().read(uploaded.key);
    expect(readBack).toBeTruthy();
    expect(Buffer.from(readBack!.data).toString("utf8")).toBe("hello-storage");

    const res = await app.request(`/${uploaded.key}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello-storage");
  });
});
