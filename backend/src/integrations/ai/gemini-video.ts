import { readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const promptsDir = join(dirname(fileURLToPath(import.meta.url)), "prompts");

export interface NormalizedVideoAnalysis {
  uploadStatus: "completed" | "failed";
  processedAt: Date;
  errorMessage: string | null;
  analysisResult: string;
  professionalism: string | null;
  energyLevels: string | null;
  communication: string | null;
  sociability: string | null;
  overallScore: number | null;
  videoScore: number | null;
  confidenceScore: number | null;
  clarityScore: number | null;
  communicationScore: number | null;
  backgroundScore: number | null;
  needsImprovements: string[];
  detailedAnalysis: Record<string, unknown>;
}

const videoAnalysisSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["completed"] },
    video_scores: {
      type: "object",
      properties: {
        professionalism: { type: "string" },
        energy_level: { type: "string" },
        communication: { type: "string" },
        sociability: { type: "string" },
      },
      required: ["professionalism", "energy_level", "communication", "sociability"],
    },
    video_analysis: {
      type: "object",
      properties: {
        overall_score: { type: "string" },
        overall_comment: { type: "string" },
        score_breakdown: { type: "object" },
        confidence: { type: "string" },
        clarity: { type: "string" },
        communication: { type: "string" },
        background: { type: "string" },
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
        final_suggestion: { type: "array", items: { type: "string" } },
        analysis_confidence: { type: "number" },
      },
      required: [
        "overall_score",
        "overall_comment",
        "score_breakdown",
        "confidence",
        "clarity",
        "communication",
        "background",
        "strengths",
        "weaknesses",
        "final_suggestion",
        "analysis_confidence",
      ],
    },
  },
  required: ["status", "video_scores", "video_analysis"],
};

function parsePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    if (value.includes("/")) {
      const [num, den] = value.split("/").map(Number);
      if (!Number.isNaN(num) && !Number.isNaN(den) && den > 0) return (num / den) * 100;
    }
    return Number(value.replace("%", ""));
  }
  return null;
}

function formatPercent(value: unknown): string | null {
  const parsed = parsePercent(value);
  return parsed === null || Number.isNaN(parsed) ? null : `${Math.round(parsed)}%`;
}

function inferMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
  };
  return map[ext] ?? "video/mp4";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeVideoWithGemini(
  apiKey: string,
  filePath: string,
  mimeType?: string,
): Promise<NormalizedVideoAnalysis> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const effectiveMimeType = mimeType ?? inferMimeType(filePath);
  const prompt = readFileSync(join(promptsDir, "analyze-video-system.md"), "utf8");

  const uploadedFile = await ai.files.upload({
    file: filePath,
    config: { mimeType: effectiveMimeType, displayName: filePath.split("/").pop() },
  });

  let currentFile = uploadedFile;
  const started = Date.now();
  while (currentFile.state && String(currentFile.state) !== "ACTIVE") {
    if (String(currentFile.state) === "FAILED") throw new Error("Gemini file processing failed");
    if (Date.now() - started > 120_000) throw new Error("Gemini file processing timed out");
    await sleep(3000);
    currentFile = await ai.files.get({ name: currentFile.name! });
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          { fileData: { mimeType: effectiveMimeType, fileUri: currentFile.uri! } },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: videoAnalysisSchema,
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });

  try {
    await ai.files.delete({ name: currentFile.name! });
  } catch {
    // non-fatal
  }

  const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const result = JSON.parse(cleaned);

  const { video_scores, video_analysis } = result;
  const breakdown = video_analysis.score_breakdown ?? {};

  const mainScores = [
    parsePercent(video_scores.professionalism),
    parsePercent(video_scores.energy_level),
    parsePercent(video_scores.communication),
    parsePercent(video_scores.sociability),
  ].filter((s): s is number => s !== null && !Number.isNaN(s));

  return {
    uploadStatus: "completed",
    processedAt: new Date(),
    errorMessage: null,
    analysisResult: JSON.stringify(result),
    professionalism: formatPercent(video_scores.professionalism),
    energyLevels: formatPercent(video_scores.energy_level),
    communication: formatPercent(video_scores.communication),
    sociability: formatPercent(video_scores.sociability),
    overallScore: parsePercent(video_analysis.overall_score),
    videoScore: mainScores.length
      ? mainScores.reduce((sum, s) => sum + s, 0) / mainScores.length
      : null,
    confidenceScore: parsePercent(breakdown.confidence),
    clarityScore: parsePercent(breakdown.clarity),
    communicationScore: parsePercent(breakdown.communication),
    backgroundScore: parsePercent(breakdown.background),
    needsImprovements: Array.isArray(video_analysis.final_suggestion)
      ? video_analysis.final_suggestion
      : [],
    detailedAnalysis: { ...video_analysis, video_scores },
  };
}
