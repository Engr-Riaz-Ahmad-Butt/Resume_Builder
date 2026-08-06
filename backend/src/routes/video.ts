import { Hono } from "hono";

import { env } from "@/lib/env";
import { analyzeVideoWithGemini } from "@/integrations/ai/gemini-video";
import { db } from "@/integrations/drizzle/client";
import { videoAnalysis } from "@/integrations/drizzle/schema";
import { eq } from "drizzle-orm";

async function markCompleted(id: string, data: Awaited<ReturnType<typeof analyzeVideoWithGemini>>) {
  await db
    .update(videoAnalysis)
    .set({
      uploadStatus: "completed",
      processedAt: data.processedAt,
      analysisResult: data.analysisResult,
      professionalism: data.professionalism,
      energyLevels: data.energyLevels,
      communication: data.communication,
      sociability: data.sociability,
      overallScore: data.overallScore,
      videoScore: data.videoScore,
      confidenceScore: data.confidenceScore,
      clarityScore: data.clarityScore,
      communicationScore: data.communicationScore,
      backgroundScore: data.backgroundScore,
      needsImprovements: data.needsImprovements,
      detailedAnalysis: data.detailedAnalysis as Record<string, unknown>,
    })
    .where(eq(videoAnalysis.id, id));
}

async function markFailed(id: string, errorMessage: string) {
  await db
    .update(videoAnalysis)
    .set({ uploadStatus: "failed", processedAt: new Date(), errorMessage })
    .where(eq(videoAnalysis.id, id));
}

export const videoRoutes = new Hono().post("/api/video/analyze-internal", async (c) => {
  // Verify shared secret — frontend sends AUTH_SECRET as Bearer token
  const authHeader = c.req.header("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!env.AUTH_SECRET || token !== env.AUTH_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!env.GEMINI_API_KEY) {
    return c.json({ error: "GEMINI_API_KEY is not configured on the backend." }, 503);
  }

  const body = await c.req.json<{ rowId: string; filePath: string; mimeType: string }>();
  const { rowId, filePath, mimeType } = body;

  if (!rowId || !filePath || !mimeType) {
    return c.json({ error: "rowId, filePath, and mimeType are required." }, 400);
  }

  // Acknowledge immediately; analysis runs in background
  setImmediate(async () => {
    try {
      const result = await analyzeVideoWithGemini(env.GEMINI_API_KEY!, filePath, mimeType);
      await markCompleted(rowId, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markFailed(rowId, msg);
    }
  });

  return c.json({ queued: true });
});
