import z from "zod";

export const analysisDimensionSchema = z.object({
  dimension: z.string().min(1),
  score: z.number().int().min(0).max(100),
  rationale: z.string().min(1),
});

export const analysisSuggestionSchema = z.object({
  title: z.string().min(1),
  impact: z.enum(["high", "medium", "low"]),
  why: z.string().min(1),
  exampleRewrite: z.string().nullable(),
  copyPrompt: z.string().min(1),
});


export const skillScoreSchema = z.object({
  skill: z.string().min(1),
  score: z.number().int().min(0).max(100),
  evidence: z.string().min(1),
});

export const techTimelineItemSchema = z.object({
  technology: z.string().min(1),
  years: z.string().min(1),
  evidence: z.string().min(1),
});

export const jobSpecificAnalysisItemSchema = z.object({
  category: z.string().min(1),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  suggestions: z.array(z.string()),
  confidence: z.number().int().min(0).max(100),
});

export const resumeAnalysisSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  scorecard: z.array(analysisDimensionSchema).min(1),
  suggestions: z.array(analysisSuggestionSchema).max(10),
  strengths: z.array(z.string().min(1)).max(10),
  // Optional TalkingMe-inspired fields (additive; older analyses omit them)
  inferredRole: z.string().min(1).optional(),
  seniority: z.string().min(1).optional(),
  skillScores: z.array(skillScoreSchema).max(30).optional(),
  majorTechTimeline: z.array(techTimelineItemSchema).max(30).optional(),
  jobSpecificAnalysis: z.array(jobSpecificAnalysisItemSchema).max(20).optional(),
  missingKeywords: z.array(z.string().min(1)).max(30).optional(),
});

export const resumeAnalysisOutputSchema = z.object({
  overallScore: z.number(),
  scorecard: z.array(
    z.object({
      dimension: z.string(),
      score: z.number(),
      rationale: z.string(),
    }),
  ),
  suggestions: z.array(
    z.object({
      title: z.string(),
      impact: z.enum(["high", "medium", "low"]),
      why: z.string(),
      exampleRewrite: z.string().nullable(),
      copyPrompt: z.string(),
    }),
  ),
  strengths: z.array(z.string()),
  inferredRole: z.string().optional(),
  seniority: z.string().optional(),
  skillScores: z
    .array(z.object({ skill: z.string(), score: z.number(), evidence: z.string() }))
    .optional(),
  majorTechTimeline: z
    .array(z.object({ technology: z.string(), years: z.string(), evidence: z.string() }))
    .optional(),
  jobSpecificAnalysis: z
    .array(
      z.object({
        category: z.string(),
        strengths: z.array(z.string()),
        areasForImprovement: z.array(z.string()),
        suggestions: z.array(z.string()),
        confidence: z.number(),
      }),
    )
    .optional(),
  missingKeywords: z.array(z.string()).optional(),
});

export const storedResumeAnalysisSchema = resumeAnalysisSchema.extend({
  updatedAt: z.coerce.date(),
  modelMeta: z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
  }),
});

export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;
export type StoredResumeAnalysis = z.infer<typeof storedResumeAnalysisSchema>;
