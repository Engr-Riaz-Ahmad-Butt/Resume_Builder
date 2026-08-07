# TalkingMe → Reactive Resume merge

**Source:** https://github.com/Engr-Riaz-Ahmad-Butt/talkingMe  
**Local inspect:** `/home/ashar/talkingMe-inspect`  
**Target:** this monorepo (`frontend/` + `backend/`)

## Intake decisions

| Item | Decision |
|------|----------|
| Source repo | TalkingMe (Express + Next.js profile/coaching app) |
| Analyze resume | **Enhance** existing `ai.analyzeResume` / `resume_analysis` — no second Gemini-only pipeline |
| Analyze video | Intro/interview video scoring via Gemini multimodal |
| Create portfolio | TalkingMe-style shareable profile hub (resumes + video scores), not a separate site builder |

## Inventory map

| TalkingMe | Reactive Resume destination | Status |
|-----------|----------------------------|--------|
| Resume extract (PDF/DOCX → custom JSON) | Existing `ai.parsePdf` / `parseDocx` → `ResumeData` | Reuse RR parsers |
| Resume score (`ExtractedData`, Gemini) | Extend [`schema/resume/analysis.ts`](../frontend/src/schema/resume/analysis.ts) + prompt + builder UI | **Done** |
| Video intro upload + Gemini analysis | `video_analysis` table, `video.*` oRPC, `/dashboard/video-analysis`, Gemini service | **Done** (BE + FE bridge) |
| Profile create (`multi-section`) | `portfolio` table + `portfolio.*` oRPC + dashboard/public routes | **Done** |
| Public profile page | `/p/$username/$slug` public portfolio page | **Done** |
| Express JWT / Sequelize / webhooks | Better Auth + Drizzle + oRPC | Do **not** port |

### Video (shipped)

- Backend: `integrations/ai/gemini-video.ts`, `orpc/services/video-analysis.ts`, `orpc/router/video.ts`, `routes/video.ts` (internal analyze), migration `video_analysis`
- Frontend: dashboard UI; FE oRPC upload queues via `BACKEND_URL` → `/api/video/analyze-internal`

### Portfolio (shipped)

- Table `portfolio` (name, slug, isPublic, optional resumeId, userId) + migration `20260807095500_portfolio_hub`
- oRPC: `portfolio.create` / `list` / `update` / `delete` / `getPublic` (BE + FE mirrors)
- Dashboard `/dashboard/portfolio` — create hubs, toggle public, link resume, show video scores
- Public page `/p/$username/$slug` — resume link + latest completed video scores

### Resume analysis (shipped)

- Additive optional fields: `inferredRole`, `seniority`, `skillScores`, `majorTechTimeline`, `jobSpecificAnalysis`, `missingKeywords`
- Enriched `analyze-resume-system.md` (BE + FE); builder sidebar renders extra sections when present

## Concrete port checklist

1. [x] Intake + inventory
2. [x] Video analysis (Gemini + DB + UI)
3. [x] Portfolio schema + migration + oRPC + public route + dashboard wiring
4. [x] Resume analysis schema/prompt/UI enrichment
5. [x] Smoke/integration tests for portfolio procedures (`portfolio.test.ts`); video smoke already present

## API contracts

**Video:** `video.upload` | `getStatus` | `list` | `getLatest`

**Portfolio:**

- `portfolio.create` `{ name, slug?, resumeId? }` → portfolio
- `portfolio.list` → portfolios[]
- `portfolio.update` `{ id, name?, slug?, resumeId?, isPublic? }`
- `portfolio.delete` `{ id }`
- `portfolio.getPublic` `{ username, slug }` (public) → portfolio + owner + resume summary + latest video scores

## File-level targets (reference)

| Area | Paths |
|------|--------|
| Schema | `backend|frontend/src/integrations/drizzle/schema.ts` (`portfolio`) |
| Migration | `backend/migrations/20260807095500_portfolio_hub/` |
| Service | `backend|frontend/src/integrations/orpc/services/portfolio.ts` |
| Router | `backend|frontend/src/integrations/orpc/router/portfolio.ts` |
| Analysis schema | `backend|frontend/src/schema/resume/analysis.ts` |
| Analysis prompt | `backend|frontend/src/integrations/ai/prompts/analyze-resume-system.md` |
| Builder UI | `frontend/src/routes/builder/$resumeId/-sidebar/right/sections/resume-analysis.tsx` |
| Dashboard | `frontend/src/routes/dashboard/portfolio/index.tsx` |
| Public | `frontend/src/routes/p/$username/$slug.tsx` |

## Out of scope

TalkingMe webhooks, chunked voice upload, Face ID, Express session, dual Gemini resume extract pipeline.
