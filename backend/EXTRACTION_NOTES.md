# Backend Extraction Notes

Branch: `feat/backend-extraction`  
Plan: Backend Extraction — Locked Plan (v5)  
Stop point: M14 (this document). Frontend server copies were **not** deleted.

## Module checklist

| Module | Status | Commit (message) | Notes |
|--------|--------|------------------|-------|
| M00 folders | done | `chore: split monorepo into frontend/ and backend/ with pnpm workspace` | `frontend/` + `backend/` + `pnpm-workspace.yaml` |
| M01 scaffold | done | `chore(backend): scaffold Hono…` | Health, pino, request-ID, security headers, graceful shutdown, `.nvmrc`, CI |
| M02 env/db/redis | done | `feat(backend): add Drizzle, Redis, CI services, and test DB reset helpers` | Truncate/`FLUSHDB` helpers; Redis in compose |
| M03 schema | done | `feat(backend): add ResumeData Zod schemas` | `backend/src/schema/**` |
| M04 utils | done | `feat(backend): add shared server utilities` | Printer token without TanStack; sanitize; patch Zod4 |
| M05 auth | done | `feat(backend): mount Better Auth with integration tests` | `/api/auth`; signup/login tests |
| M06 oRPC shell | done | `feat(backend): mount oRPC and export AppRouter type` | `/api/rpc`; `AppRouter` export |
| M07 resumes | done | `feat(backend): add resume oRPC module with integration tests` | CRUD via service + auth |
| M08 storage | done | `feat(backend): add storage with integration tests` | Upload/get + uploads GET |
| M09 JWT + CORS | done | `feat(backend): add JWT bearer auth and CORS` | Dual Bearer FLAG; `cors-test.html` manual |
| M10 printer | done | `feat(backend): add printer PDF service` | URL/token tests without Browserless |
| M11 AI + jobs | done | `feat(backend): add AI and job-search modules` | Smoke tests; prompts via `fs` (no `?raw`) |
| M12 MCP | done | `feat(backend): add MCP server and well-known routes` | API-key `initialize` integration test |
| M13 BullMQ + Redis RL | done | `feat(backend): add BullMQ ping job and Redis-backed rate limits` | Ping → `queue_ping`; oRPC `RedisRatelimiter` |
| M14 notes | done | `docs(backend): add extraction notes` | This file |

## Critical flags (honored)

1. **Printer page on frontend** — PDF/screenshot rendering still loads a React page from the frontend. `PRINTER_APP_URL` must point at the frontend origin (not the backend). Backend only orchestrates Browserless + signed printer tokens.
2. **Dual Bearer** — Distinct verify paths:
   - oRPC: `verifyUserJwt` then `verifyOAuthToken` (`FLAG(M09)` in `integrations/orpc/context.ts` / `integrations/auth/config.ts`).
   - MCP gate: **MCP OAuth only** (`verifyOAuthToken`) or `x-api-key` — does **not** accept user JWTs.
3. **Consent / OAuth UX** — Login/consent pages remain on the frontend; `FRONTEND_ORIGIN` / trusted origins drive CORS and OAuth redirects.
4. **Rate limits** — oRPC limiters moved to Redis in M13 (`@orpc/experimental-ratelimit/redis`). Better Auth uses Redis `secondaryStorage` with `session.storeSessionInDatabase: true`. Integration tests that hit auth should `resetRedis()` in `beforeEach`.
5. **jsonb read validation** — Follow-up only (not done in M07). Resume JSON from Postgres is not re-validated with Zod on every read path yet.

## Frontend import list (still present; do not delete until confirmed)

These frontend server-side surfaces still exist as copies. Backend owns the live API going forward; strip only after explicit confirmation.

| Area | Frontend paths (representative) |
|------|----------------------------------|
| Auth | `frontend/src/integrations/auth/**`, `frontend/src/routes/api/auth.$.ts`, `frontend/src/routes/auth/oauth.ts` |
| oRPC | `frontend/src/integrations/orpc/**` |
| Resume / storage / printer / AI / jobs services | under `frontend/src/integrations/orpc/services/` and routers |
| MCP | `frontend/src/routes/mcp/**`, `frontend/src/[.]well-known/**` |
| Schema / utils | `frontend/src/schema/**`, `frontend/src/utils/**` (many duplicated under `backend/src/`) |
| Drizzle / migrations | historically under frontend; backend has its own `backend/migrations/` (+ `queue_ping` from M13) |
| Rate limit | `frontend/src/integrations/orpc/rate-limit.ts` (still in-memory on FE) |

## Backend surface (current)

| Mount | Purpose |
|-------|---------|
| `GET /api/health` | Liveness (+ Redis ping when configured) |
| `/api/auth/*` | Better Auth |
| `/api/rpc/*` | oRPC (`AppRouter`: auth, resume, storage, printer, ai, jobs, queue) |
| `/mcp` | MCP Streamable HTTP (OAuth Bearer or `x-api-key`) |
| `/.well-known/*` | OAuth protected-resource, AS metadata, OIDC, MCP server-card |
| Uploads GET | Local/S3 file fetch route |

Exported type for FE clients: `backend/src/orpc/router.ts` → `AppRouter`.

## Follow-ups (explicitly deferred)

- **jsonb read-path Zod validation** on resume (and related) loads.
- **Printer coupling** — keep Browserless → frontend printer page until a dedicated print host or SSR path exists; document `PRINTER_APP_URL` in deploy runbooks.
- **Dual Bearer documentation for FE clients** — ensure SPA sends user JWT to oRPC and MCP clients send OAuth / API key only.
- **Delete frontend server copies** — only after user confirmation (out of scope for this branch stop).
- **TalkingMe ports / Next.js rewrite** — out of scope.
- **Push to GitHub** — local commits may be ahead; HTTPS push failed without credentials in this environment.
- **Better Auth rate-limit storage** — BA global limiter still uses plugin config; Redis secondaryStorage backs session/cache. Revisit BA-native Redis rate-limit adapter if needed.
- **MCP tools → live Browserless** — printer tools in MCP still depend on printer env; treat Browserless as optional in CI.

## Test isolation (locked)

- Postgres: `backend/src/test/reset-db.ts` — `TRUNCATE … CASCADE` in `beforeEach`.
- Redis: dedicated DB index (e.g. `/15`); `backend/src/test/reset-redis.ts` — `FLUSHDB` when suite touches Redis/queues/rate-limits/auth secondaryStorage.
- Details: `backend/src/test/README.md`.

## Local run reminders

```bash
# services
docker compose -f compose.dev.yml up -d postgres browserless redis   # or test containers on 5433/6380

# backend
pnpm --dir backend install
pnpm --dir backend typecheck
pnpm --dir backend lint
pnpm --dir backend test
pnpm --dir backend dev   # or start via package scripts / node src/index.ts
```

Env: `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, `APP_URL`, `FRONTEND_ORIGIN`, `PRINTER_APP_URL`, `PRINTER_ENDPOINT`.

## Out of scope (unchanged)

TalkingMe ports; Next.js frontend rewrite; force-push `main`; stripping FE server integrations before confirmation.
