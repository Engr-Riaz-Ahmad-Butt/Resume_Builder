import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app";
import { closeDb, db } from "@/integrations/drizzle/client";
import { schema } from "@/integrations/drizzle";
import { resumeService } from "@/integrations/orpc/services/resume";
import { closeRedis } from "@/lib/redis";
import { resetDb } from "@/test/reset-db";
import { eq } from "drizzle-orm";

function uniqueUser() {
  const id = crypto.randomUUID().slice(0, 8);
  return {
    name: `Resume User ${id}`,
    email: `resume-${id}@example.com`,
    password: "Password123!",
    username: `resume_${id}`,
  };
}

describe("resume module integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
    await closeRedis();
  });

  it("creates, gets by id, updates, and gets by slug", async () => {
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

    const resumeId = await resumeService.create({
      name: "My Resume",
      slug: "my-resume",
      tags: ["dev"],
      locale: "en-US",
      userId: dbUser!.id,
    });
    expect(resumeId).toBeTruthy();

    const byId = await resumeService.getById({ id: resumeId, userId: dbUser!.id });
    expect(byId.id).toBe(resumeId);
    expect(byId.slug).toBe("my-resume");

    const updated = await resumeService.update({
      id: resumeId,
      userId: dbUser!.id,
      name: "Updated Resume",
      isPublic: true,
    });
    expect(updated.name).toBe("Updated Resume");
    expect(updated.isPublic).toBe(true);

    const bySlug = await resumeService.getBySlug({
      username: userInput.username,
      slug: "my-resume",
      currentUserId: undefined,
    });
    expect(bySlug.id).toBe(resumeId);
  });
});
