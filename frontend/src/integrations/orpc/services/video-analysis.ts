import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";

import { db } from "@/integrations/drizzle/client";
import * as schema from "@/integrations/drizzle/schema";
import { env } from "@/utils/env";

export type VideoAnalysisRow = typeof schema.videoAnalysis.$inferSelect;

const EXT_BY_MIME: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-matroska": ".mkv",
};

export async function getLatestVideoAnalysis(userId: string): Promise<VideoAnalysisRow | null> {
  const rows = await db
    .select()
    .from(schema.videoAnalysis)
    .where(eq(schema.videoAnalysis.userId, userId))
    .orderBy(desc(schema.videoAnalysis.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getVideoAnalysisById(id: string, userId: string): Promise<VideoAnalysisRow | null> {
  const rows = await db
    .select()
    .from(schema.videoAnalysis)
    .where(eq(schema.videoAnalysis.id, id))
    .limit(1);
  const row = rows[0] ?? null;
  if (!row || row.userId !== userId) return null;
  return row;
}

export async function listVideoAnalyses(userId: string): Promise<VideoAnalysisRow[]> {
  return db
    .select()
    .from(schema.videoAnalysis)
    .where(eq(schema.videoAnalysis.userId, userId))
    .orderBy(desc(schema.videoAnalysis.createdAt));
}

export async function uploadAndQueueVideoAnalysis(userId: string, file: File): Promise<VideoAnalysisRow> {
  const mimeType = file.type || "video/mp4";
  const ext = EXT_BY_MIME[mimeType] ?? extname(file.name) ?? ".mp4";
  const tmpPath = join(tmpdir(), `video-${randomUUID()}${ext}`);

  // Save file to a temp path shared with the backend process (same machine)
  const buffer = new Uint8Array(await file.arrayBuffer());
  await mkdir(tmpdir(), { recursive: true });
  await writeFile(tmpPath, buffer);

  // Create a DB row that the backend will update once analysis completes
  const [row] = await db
    .insert(schema.videoAnalysis)
    .values({ userId, storagePath: tmpPath, mimeType, uploadStatus: "processing" })
    .returning();
  if (!row) throw new Error("Failed to create video_analysis row");

  // Call the backend's internal endpoint — it runs Gemini analysis and updates the row
  const backendUrl = env.BACKEND_URL ?? "http://localhost:3001";
  const response = await fetch(`${backendUrl}/api/video/analyze-internal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AUTH_SECRET}`,
    },
    body: JSON.stringify({ rowId: row.id, filePath: tmpPath, mimeType }),
  });

  if (!response.ok) {
    const text = await response.text();
    // Mark failed immediately if the backend is unreachable
    await db
      .update(schema.videoAnalysis)
      .set({ uploadStatus: "failed", errorMessage: `Backend error: ${text}` })
      .where(eq(schema.videoAnalysis.id, row.id));
  }

  return row;
}
