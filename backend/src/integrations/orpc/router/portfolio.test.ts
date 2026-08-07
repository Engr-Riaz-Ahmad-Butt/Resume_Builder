import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app";
import { closeDb, db } from "@/integrations/drizzle/client";
import { schema } from "@/integrations/drizzle";
import { portfolioService } from "@/integrations/orpc/services/portfolio";
import { resumeService } from "@/integrations/orpc/services/resume";
import { closeRedis } from "@/lib/redis";
import { resetDb } from "@/test/reset-db";
import { eq } from "drizzle-orm";

function uniqueUser() {
  const id = crypto.randomUUID().slice(0, 8);
  return {
    name: `Portfolio User ${id}`,
    email: `portfolio-${id}@example.com`,
    password: "Password123!",
    username: `port_${id}`,
  };
}

describe("portfolio module integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
    await closeRedis();
  });

  it("creates, lists, updates public flag, and serves getPublic", async () => {
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
      name: "Linked Resume",
      slug: "linked-resume",
      tags: [],
      locale: "en-US",
      userId: dbUser!.id,
    });

    await resumeService.update({
      id: resumeId,
      userId: dbUser!.id,
      isPublic: true,
    });

    const created = await portfolioService.create({
      userId: dbUser!.id,
      name: "My Hub",
      resumeId,
    });
    expect(created.slug).toBe("my-hub");
    expect(created.isPublic).toBe(false);

    const listed = await portfolioService.list(dbUser!.id);
    expect(listed).toHaveLength(1);

    const published = await portfolioService.update({
      id: created.id,
      userId: dbUser!.id,
      isPublic: true,
    });
    expect(published.isPublic).toBe(true);

    const publicView = await portfolioService.getPublic({
      username: userInput.username,
      slug: "my-hub",
    });
    expect(publicView.portfolio.id).toBe(created.id);
    expect(publicView.resume?.id).toBe(resumeId);
    expect(publicView.owner.username).toBe(userInput.username);

    await portfolioService.delete({ id: created.id, userId: dbUser!.id });
    const afterDelete = await portfolioService.list(dbUser!.id);
    expect(afterDelete).toHaveLength(0);
  });
});
