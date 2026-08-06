import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";

import { desc, eq } from "drizzle-orm";

import {
  analyzeVideoWithGemini,
  type NormalizedVideoAnalysis,
} from "@/integrations/ai/gemini-video";
import { db } from "@/integrations/drizzle/client";
import * as schema from "@/integrations/drizzle/schema";
import { getStorageService } from "@/integrations/orpc/services/storage";

export type VideoAnalysisRow = typeof schema.videoAnalysis.$inferSelect;

const EXT_BY_MIME: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-matroska": ".mkv",
};

async function getLatest(userId: string): Promise<VideoAnalysisRow | null> {
  const rows = await db
    .select()
    .from(schema.videoAnalysis)
    .where(eq(schema.videoAnalysis.userId, userId))
    .orderBy(desc(schema.videoAnalysis.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

async function getById(id: string, userId: string): Promise<VideoAnalysisRow | null> {
  const rows = await db
    .select()
    .from(schema.videoAnalysis)
    .where(eq(schema.videoAnalysis.id, id))
    .limit(1);
  const row = rows[0] ?? null;
  if (!row || row.userId !== userId) return null;
  return row;
}

async function listForUser(userId: string): Promise<VideoAnalysisRow[]> {
  return db
    .select()
    .from(schema.videoAnalysis)
    .where(eq(schema.videoAnalysis.userId, userId))
    .orderBy(desc(schema.videoAnalysis.createdAt));
}

async function createPending(
  userId: string,
  storagePath: string,
  mimeType: string,
): Promise<VideoAnalysisRow> {
  const [row] = await db
    .insert(schema.videoAnalysis)
    .values({ userId, storagePath, mimeType, uploadStatus: "processing" })
    .returning();
  if (!row) throw new Error("Failed to create video_analysis row");
  return row;
}

async function markCompleted(id: string, data: NormalizedVideoAnalysis): Promise<void> {
  await db
    .update(schema.videoAnalysis)
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
      detailedAnalysis: data.detailedAnalysis,
    })
    .where(eq(schema.videoAnalysis.id, id));
}

async function markFailed(id: string, errorMessage: string): Promise<void> {
  await db
    .update(schema.videoAnalysis)
    .set({ uploadStatus: "failed", processedAt: new Date(), errorMessage })
    .where(eq(schema.videoAnalysis.id, id));
}

function buildVideoKey(userId: string, mimeType: string, originalName: string): string {
  const fromName = extname(originalName).toLowerCase();
  const ext = fromName || EXT_BY_MIME[mimeType] || ".mp4";
  return `uploads/${userId}/videos/${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
}

/**
 * Persist video to storage, analyze via Gemini from a temp copy, keep durable storagePath.
 * Analysis runs in-process (setImmediate). BullMQ worker is a follow-up.
 */
export async function uploadAndAnalyzeVideo(
  userId: string,
  apiKey: string,
  file: File,
): Promise<VideoAnalysisRow> {
  const mimeType = file.type || "video/mp4";
  const buffer = new Uint8Array(await file.arrayBuffer());
  const storageKey = buildVideoKey(userId, mimeType, file.name);

  await getStorageService().write({
    key: storageKey,
    data: buffer,
    contentType: mimeType,
  });

  const row = await createPending(userId, storageKey, mimeType);

  setImmediate(() => {
    void (async () => {
      const ext = EXT_BY_MIME[mimeType] || extname(file.name) || ".mp4";
      const tmpPath = join(tmpdir(), `video-${row.id}${ext}`);
      try {
        await mkdir(tmpdir(), { recursive: true });
        await writeFile(tmpPath, buffer);
        const result = await analyzeVideoWithGemini(apiKey, tmpPath, mimeType);
        await markCompleted(row.id, result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await markFailed(row.id, msg);
      } finally {
        await unlink(tmpPath).catch(() => undefined);
      }
    })();
  });

  return row;
}

export const videoAnalysisService = {
  getLatest,
  getById,
  listForUser,
  uploadAndAnalyzeVideo,
};

// Named exports matching FE service API
export const getLatestVideoAnalysis = getLatest;
export const getVideoAnalysisById = getById;
export const listVideoAnalyses = listForUser;
