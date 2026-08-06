import { ORPCError } from "@orpc/server";
import z from "zod";

import { env } from "@/lib/env";

import { protectedProcedure } from "../context";
import { videoUploadRateLimit } from "../rate-limit";
import {
  getLatestVideoAnalysis,
  getVideoAnalysisById,
  listVideoAnalyses,
  uploadAndAnalyzeVideo,
  type VideoAnalysisRow,
} from "../services/video-analysis";

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];

function toResponse(row: VideoAnalysisRow) {
  return {
    id: row.id,
    status: row.uploadStatus,
    processedAt: row.processedAt,
    errorMessage: row.errorMessage,
    professionalism: row.professionalism,
    energyLevels: row.energyLevels,
    communication: row.communication,
    sociability: row.sociability,
    overallScore: row.overallScore,
    videoScore: row.videoScore,
    confidenceScore: row.confidenceScore,
    clarityScore: row.clarityScore,
    communicationScore: row.communicationScore,
    backgroundScore: row.backgroundScore,
    needsImprovements: (row.needsImprovements as string[]) ?? [],
    detailedAnalysis: row.detailedAnalysis ?? null,
    createdAt: row.createdAt,
  };
}

export const videoRouter = {
  upload: protectedProcedure
    .use(videoUploadRateLimit)
    .route({
      method: "POST",
      path: "/video/upload",
      tags: ["Video"],
      operationId: "uploadVideo",
      summary: "Upload a video for AI analysis",
      description:
        "Uploads a video file and queues it for Gemini AI analysis. Returns immediately with status 'processing'. Requires GEMINI_API_KEY on the server.",
    })
    .input(z.file().max(MAX_VIDEO_SIZE, "Video must be under 100MB"))
    .handler(async ({ context, input: file }) => {
      if (!env.GEMINI_API_KEY) {
        throw new ORPCError("BAD_REQUEST", {
          message: "GEMINI_API_KEY is not configured. Video analysis is unavailable.",
        });
      }
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Unsupported video type: ${file.type}. Allowed: ${ALLOWED_VIDEO_TYPES.join(", ")}`,
        });
      }

      const row = await uploadAndAnalyzeVideo(context.user.id, env.GEMINI_API_KEY, file);
      return { id: row.id, status: row.uploadStatus, createdAt: row.createdAt };
    }),

  getStatus: protectedProcedure
    .route({
      method: "GET",
      path: "/video/:id/status",
      tags: ["Video"],
      operationId: "getVideoStatus",
      summary: "Poll video analysis status",
    })
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ context, input }) => {
      const row = await getVideoAnalysisById(input.id, context.user.id);
      if (!row) throw new ORPCError("NOT_FOUND", { message: "Video analysis not found." });
      return toResponse(row);
    }),

  list: protectedProcedure
    .route({
      method: "GET",
      path: "/video",
      tags: ["Video"],
      operationId: "listVideoAnalyses",
      summary: "List all video analyses for the current user",
    })
    .handler(async ({ context }) => {
      const rows = await listVideoAnalyses(context.user.id);
      return rows.map(toResponse);
    }),

  getLatest: protectedProcedure
    .route({
      method: "GET",
      path: "/video/latest",
      tags: ["Video"],
      operationId: "getLatestVideoAnalysis",
      summary: "Get the most recent video analysis for the current user",
    })
    .handler(async ({ context }) => {
      const row = await getLatestVideoAnalysis(context.user.id);
      if (!row) return null;
      return toResponse(row);
    }),
};
