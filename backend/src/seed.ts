/**
 * Database seed script.
 *
 * Creates:
 *   - 1 admin user
 *   - 2 regular users
 *   - 2 resumes per regular user (one with sample data, one blank)
 *   - Resume statistics for each resume
 *
 * Usage:
 *   pnpm --dir backend db:seed
 *
 * Safe to re-run — skips already-seeded users by email.
 */

import "dotenv/config";

import { eq } from "drizzle-orm";

import { closeDb, db } from "./integrations/drizzle/client.js";
import * as schema from "./integrations/drizzle/schema.js";
import { sampleResumeData } from "./schema/resume/sample.js";
import { defaultResumeData } from "./schema/resume/data.js";
import { generateId } from "./utils/string.js";
import { hashPassword } from "./utils/password.js";

// ─── Seed data ─────────────────────────────────────────────────────────────

const SEED_USERS = [
  {
    name: "Admin User",
    email: "admin@example.com",
    username: "admin",
    displayUsername: "admin",
    password: "Admin@123456",
    role: "admin" as const,
  },
  {
    name: "John Doe",
    email: "john@example.com",
    username: "johndoe",
    displayUsername: "johndoe",
    password: "John@123456",
    role: "user" as const,
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    username: "janesmith",
    displayUsername: "janesmith",
    password: "Jane@123456",
    role: "user" as const,
  },
];

const SEED_RESUMES: Array<{
  userEmail: string;
  name: string;
  slug: string;
  isPublic: boolean;
  withSampleData: boolean;
  tags: string[];
}> = [
  {
    userEmail: "john@example.com",
    name: "Software Engineer Resume",
    slug: "software-engineer",
    isPublic: true,
    withSampleData: true,
    tags: ["engineering", "featured"],
  },
  {
    userEmail: "john@example.com",
    name: "Blank Resume",
    slug: "blank",
    isPublic: false,
    withSampleData: false,
    tags: [],
  },
  {
    userEmail: "jane@example.com",
    name: "Product Manager Resume",
    slug: "product-manager",
    isPublic: true,
    withSampleData: true,
    tags: ["management", "featured"],
  },
  {
    userEmail: "jane@example.com",
    name: "Side Project Resume",
    slug: "side-project",
    isPublic: false,
    withSampleData: false,
    tags: ["projects"],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

async function upsertUser(data: (typeof SEED_USERS)[number]): Promise<string> {
  const [existing] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, data.email))
    .limit(1);

  if (existing) {
    console.log(`  ↳ User already exists: ${data.email}`);
    return existing.id;
  }

  const id = generateId();
  const passwordHash = await hashPassword(data.password);

  await db.insert(schema.user).values({
    id,
    name: data.name,
    email: data.email,
    emailVerified: true,
    username: data.username,
    displayUsername: data.displayUsername,
    role: data.role,
  });

  await db.insert(schema.account).values({
    id: generateId(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: passwordHash,
  });

  console.log(`  ✓ Created user: ${data.email} (password: ${data.password})`);
  return id;
}

async function upsertResume(
  userId: string,
  data: (typeof SEED_RESUMES)[number],
): Promise<string> {
  const [existing] = await db
    .select()
    .from(schema.resume)
    .where(eq(schema.resume.slug, data.slug))
    .limit(1);

  if (existing && existing.userId === userId) {
    console.log(`  ↳ Resume already exists: ${data.slug}`);
    return existing.id;
  }

  const id = generateId();
  const resumeData = data.withSampleData ? sampleResumeData : defaultResumeData;

  await db.insert(schema.resume).values({
    id,
    userId,
    name: data.name,
    slug: data.slug,
    isPublic: data.isPublic,
    tags: data.tags,
    data: resumeData,
  });

  if (data.isPublic) {
    const views = Math.floor(Math.random() * 500) + 50;
    const downloads = Math.floor(Math.random() * 100) + 10;

    await db.insert(schema.resumeStatistics).values({
      resumeId: id,
      views,
      downloads,
      lastViewedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      lastDownloadedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
    });
  }

  console.log(`  ✓ Created resume: "${data.name}" (public: ${data.isPublic})`);
  return id;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Starting database seed...\n");

  const userIdByEmail: Record<string, string> = {};

  console.log("👤 Seeding users...");
  for (const userData of SEED_USERS) {
    const id = await upsertUser(userData);
    userIdByEmail[userData.email] = id;
  }

  console.log("\n📄 Seeding resumes...");
  for (const resumeData of SEED_RESUMES) {
    const userId = userIdByEmail[resumeData.userEmail];
    if (!userId) continue;
    await upsertResume(userId, resumeData);
  }

  console.log("\n✅ Seed complete!\n");
  console.log("─────────────────────────────────────────");
  console.log("Test accounts:");
  for (const u of SEED_USERS) {
    console.log(`  ${u.role === "admin" ? "👑" : "👤"} ${u.email}  /  ${u.password}`);
  }
  console.log("─────────────────────────────────────────\n");
}

main()
  .catch((err) => {
    console.error("\n❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => closeDb());
