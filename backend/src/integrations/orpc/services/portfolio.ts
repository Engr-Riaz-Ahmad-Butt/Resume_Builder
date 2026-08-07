import { and, desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { get } from "es-toolkit/compat";

import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";
import { generateId, slugify } from "@/utils/string";

export type PortfolioRow = typeof schema.portfolio.$inferSelect;

function toPortfolio(row: PortfolioRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isPublic: row.isPublic,
    resumeId: row.resumeId,
    userId: row.userId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertResumeOwned(resumeId: string, userId: string) {
  const [row] = await db
    .select({ id: schema.resume.id })
    .from(schema.resume)
    .where(and(eq(schema.resume.id, resumeId), eq(schema.resume.userId, userId)))
    .limit(1);

  if (!row) {
    throw new ORPCError("BAD_REQUEST", { message: "Resume not found for this user." });
  }
}

export const portfolioService = {
  create: async (input: {
    userId: string;
    name: string;
    slug?: string;
    resumeId?: string | null;
  }) => {
    const slug = slugify(input.slug?.trim() || input.name);
    if (!slug) {
      throw new ORPCError("BAD_REQUEST", { message: "Portfolio slug cannot be empty." });
    }

    if (input.resumeId) {
      await assertResumeOwned(input.resumeId, input.userId);
    }

    const id = generateId();

    try {
      const [row] = await db
        .insert(schema.portfolio)
        .values({
          id,
          name: input.name.trim(),
          slug,
          resumeId: input.resumeId ?? null,
          userId: input.userId,
          isPublic: false,
        })
        .returning();

      return toPortfolio(row!);
    } catch (error) {
      const constraint = get(error, "cause.constraint") as string | undefined;
      if (constraint === "portfolio_slug_user_id_unique") {
        throw new ORPCError("CONFLICT", { message: "A portfolio with this slug already exists." });
      }
      throw error;
    }
  },

  list: async (userId: string) => {
    const rows = await db
      .select()
      .from(schema.portfolio)
      .where(eq(schema.portfolio.userId, userId))
      .orderBy(desc(schema.portfolio.updatedAt));

    return rows.map(toPortfolio);
  },

  update: async (input: {
    id: string;
    userId: string;
    name?: string;
    slug?: string;
    resumeId?: string | null;
    isPublic?: boolean;
  }) => {
    const [existing] = await db
      .select()
      .from(schema.portfolio)
      .where(and(eq(schema.portfolio.id, input.id), eq(schema.portfolio.userId, input.userId)))
      .limit(1);

    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "Portfolio not found." });
    }

    if (input.resumeId) {
      await assertResumeOwned(input.resumeId, input.userId);
    }

    const slug =
      input.slug !== undefined ? slugify(input.slug.trim()) : undefined;
    if (input.slug !== undefined && !slug) {
      throw new ORPCError("BAD_REQUEST", { message: "Portfolio slug cannot be empty." });
    }

    try {
      const [row] = await db
        .update(schema.portfolio)
        .set({
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(input.resumeId !== undefined ? { resumeId: input.resumeId } : {}),
          ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
        })
        .where(and(eq(schema.portfolio.id, input.id), eq(schema.portfolio.userId, input.userId)))
        .returning();

      return toPortfolio(row!);
    } catch (error) {
      const constraint = get(error, "cause.constraint") as string | undefined;
      if (constraint === "portfolio_slug_user_id_unique") {
        throw new ORPCError("CONFLICT", { message: "A portfolio with this slug already exists." });
      }
      throw error;
    }
  },

  delete: async (input: { id: string; userId: string }) => {
    const deleted = await db
      .delete(schema.portfolio)
      .where(and(eq(schema.portfolio.id, input.id), eq(schema.portfolio.userId, input.userId)))
      .returning({ id: schema.portfolio.id });

    if (deleted.length === 0) {
      throw new ORPCError("NOT_FOUND", { message: "Portfolio not found." });
    }

    return { id: input.id };
  },

  getPublic: async (input: { username: string; slug: string }) => {
    const [row] = await db
      .select({
        portfolio: schema.portfolio,
        username: schema.user.username,
        displayUsername: schema.user.displayUsername,
        userName: schema.user.name,
        userImage: schema.user.image,
        resumeId: schema.resume.id,
        resumeName: schema.resume.name,
        resumeSlug: schema.resume.slug,
        resumeIsPublic: schema.resume.isPublic,
      })
      .from(schema.portfolio)
      .innerJoin(schema.user, eq(schema.portfolio.userId, schema.user.id))
      .leftJoin(schema.resume, eq(schema.portfolio.resumeId, schema.resume.id))
      .where(
        and(
          eq(schema.user.username, input.username),
          eq(schema.portfolio.slug, input.slug),
          eq(schema.portfolio.isPublic, true),
        ),
      )
      .limit(1);

    if (!row) {
      throw new ORPCError("NOT_FOUND", { message: "Portfolio not found." });
    }

    const [latestVideo] = await db
      .select({
        id: schema.videoAnalysis.id,
        status: schema.videoAnalysis.uploadStatus,
        professionalism: schema.videoAnalysis.professionalism,
        energyLevels: schema.videoAnalysis.energyLevels,
        communication: schema.videoAnalysis.communication,
        sociability: schema.videoAnalysis.sociability,
        overallScore: schema.videoAnalysis.overallScore,
        processedAt: schema.videoAnalysis.processedAt,
        createdAt: schema.videoAnalysis.createdAt,
      })
      .from(schema.videoAnalysis)
      .where(eq(schema.videoAnalysis.userId, row.portfolio.userId))
      .orderBy(desc(schema.videoAnalysis.createdAt))
      .limit(1);

    return {
      portfolio: toPortfolio(row.portfolio),
      owner: {
        username: row.username,
        displayUsername: row.displayUsername,
        name: row.userName,
        image: row.userImage,
      },
      resume:
        row.resumeId && row.resumeIsPublic
          ? {
              id: row.resumeId,
              name: row.resumeName!,
              slug: row.resumeSlug!,
              isPublic: true as const,
            }
          : null,
      latestVideo: latestVideo ?? null,
    };
  },
};
