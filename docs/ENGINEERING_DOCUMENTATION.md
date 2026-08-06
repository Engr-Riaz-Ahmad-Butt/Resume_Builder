# Reactive Resume — Engineering Documentation

This document provides a comprehensive technical overview of the Reactive Resume project for onboarding engineering teams.

**Contents**
- Executive Summary
- Project Overview
- Architecture Overview
- Technology Stack
- Frontend Documentation
- Backend Documentation
- Database Documentation (text ERD)
- Authentication & Authorization
- Feature Documentation
- API Documentation (high level)
- Component Summary
- Third-Party Integrations
- Libraries & Dependencies
- Environment Configuration
- Security Review
- Performance Review
- Code Quality Review
- Folder Structure Documentation
- Data Flow & Request Lifecycle
- Overall Assessment & Recommendations

---

**Executive Summary**:
- **Project**: Reactive Resume is an open-source, web-based resume builder and resume hosting platform. It provides an editor, templates, previewing, PDF export, resume sharing, authentication (password, OAuth, passkeys, 2FA), API access (oRPC), and integrations (AI, job search, storage).
- **Primary audience**: end-users creating and sharing resumes; developers extending or self-hosting the application.
- **Key strengths**: Rich feature set, strong auth & security integrations (Better Auth), type-safe API surface (oRPC + Drizzle), server-side rendering with TanStack Start, robust PDF generation via Puppeteer/Browserless, multi-provider OAuth, and wide localization.

**Project Overview**:
- What it is: A single-package full-stack TypeScript app built with TanStack Start (React + Nitro), Vite+ toolchain, and Drizzle ORM backed by PostgreSQL.
- Problem solved: Simplifies resume creation, templating, export, sharing, and management with an opinionated UI and server features for self-hosted/resume-as-a-service deployments.
- Major modules:
  - Frontend app & routes (React + TanStack Router)
  - Server (Nitro via Vite+ / TanStack Start)
  - Auth (Better Auth integration)
  - API (oRPC routers and procedures under `src/integrations/orpc`)
  - Database (Postgres via Drizzle at `src/integrations/drizzle`)
  - PDF + Screenshot generation using Puppeteer/Browserless (printer service)
  - Storage abstraction (S3/local) under `src/integrations/orpc/services/storage.ts`

**High-level architecture**:
- Monolithic single-package app combining frontend and API hosting.
- Frontend routes are file-based (see `src/routes`) and compiled into an auto-generated `src/routeTree.gen.ts` used by TanStack Router. See [src/routeTree.gen.ts](src/routeTree.gen.ts) and [src/router.tsx](src/router.tsx).
- Server exposes HTTP endpoints (`/api/*`), oRPC routes (`/api/rpc/*`), openapi, printer endpoints and well-known OAuth/OpenID endpoints.
- Database is PostgreSQL accessed via Drizzle ORM; schema is defined at [src/integrations/drizzle/schema.ts](src/integrations/drizzle/schema.ts).
- Authentication and security provided by `better-auth` library configured at [src/integrations/auth/config.ts](src/integrations/auth/config.ts).
- PDF and screenshot rendering is performed by a remote Browserless/Chrome instance (configured via `PRINTER_ENDPOINT`) and controlled by `puppeteer-core` in `src/integrations/orpc/services/printer.ts`.

**Design patterns used**:
- File-based routing to auto-generate route tree (TanStack Router).
- Modular service layer for backend logic (orpc services under `src/integrations/orpc/services`).
- Adapter pattern for storage and DB (Drizzle adapter, storage service factory).
- Single source-of-truth schema via Drizzle and typed zod-based schemas for frontend validation.

---

**Technology Stack**

**Frontend**
- Framework: React (see `package.json`) — Why: popular, component-based UI model, strong ecosystem.
- Meta-framework: TanStack Start (server + SSR) + TanStack Router — used for file-based routes, SSR integration and query integration.
- Language: TypeScript.
- UI libraries: shadcn/ui (shadcn), Base UI components, Phosphor icons — used for consistent UI primitives and icons.
- CSS framework: Tailwind CSS (configured via `tailwind.config`) — utility-first styling for speed and consistent theming.
- Styling approach: Tailwind + CSS modules for preview styling (`resume/preview.module.css`) and component-level CSS when necessary.
- State management: `zustand` (including `zundo`) for client state (resume store, AI store, command palette state). Also TanStack Query for server state caching (`src/integrations/query/client.ts`).
- Routing: `@tanstack/react-router` (v1) with generated `routeTree.gen.ts` and `src/router.tsx` SSR setup.
- Form libraries: `react-hook-form` with `@hookform/resolvers` and Zod integration for validation.
- Validation: `zod` and `drizzle-zod` for schema validation and runtime safety.
- Rich text editor: `Tiptap` (@tiptap/react + extensions) for resume rich text fields.
- Drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable`.
- Charts: none core; animation uses `motion` (Framer Motion-like package named `motion`).
- Animations: `motion` and CSS transitions.
- Build tool: Vite+ (vite-plus) — unified dev/build/test tasks via `vp` CLI.
- Package manager: `pnpm` (specified in `package.json`).
- Code quality tools: Oxlint (via Vite+), Oxfmt, Vitest for tests.
- Testing: `vitest`, `@testing-library/react`.

Why each technology: chosen for modern developer ergonomics, strong type-safety, SSR, and production-friendly defaults.

**Backend**
- Framework: Nitro (via TanStack Start / Vite+), Node runtime.
- Language: TypeScript (Node ESM).
- API style: oRPC (type-safe RPC) mounted under `/api/rpc/*` plus REST-like handlers for auth/openid endpoints in `src/routes/api/*`.
- Controllers & services: oRPC routers are defined in `src/integrations/orpc/router` and service implementations in `src/integrations/orpc/services`.
- Business logic: split into `auth`, `resume`, `printer`, `storage`, `jobs`, `ai`, `flags`, `statistics` services.
- Validation: zod + Drizzle typed models.
- Middleware: rate-limiting and Better Auth middleware configured in `src/integrations/auth/config.ts` and `src/integrations/rate-limit`.
- Authentication: Better Auth (`better-auth`) with plugins: `jwt`, `admin`, `passkey`, `two-factor`, `api-key`, `oauth-provider`, `username` and custom generic OAuth; client configured in `src/integrations/auth/client.ts`.
- Authorization: enforced by `protectedProcedure` wrappers in oRPC context (see `src/integrations/orpc/context.ts`).
- Logging: standard console logging; critical errors surfaced as ORPC errors in services.
- Background jobs: limited to in-process de-duplication and caching; long-running operations (job search) have provider factories; there's no heavy job queue by default.
- Email: `nodemailer` + `react-email` templating under `src/integrations/email`.
- Storage & File uploads: storage abstraction available in `src/integrations/orpc/services/storage.ts` supporting S3 (`@aws-sdk/client-s3`) and local filesystem based on env config.
- PDF generation: `puppeteer-core` connects to Browserless/Headless Chrome via `PRINTER_ENDPOINT` and generates PDFs/screenshots in `src/integrations/orpc/services/printer.ts`.
- Error handling: standardized via ORPCError for RPC handlers and try/catch with descriptive messages in services.

Major backend files:
- oRPC router index: [src/integrations/orpc/router/index.ts](src/integrations/orpc/router/index.ts)
- Service examples: [src/integrations/orpc/services/printer.ts](src/integrations/orpc/services/printer.ts), [src/integrations/orpc/services/auth.ts](src/integrations/orpc/services/auth.ts)
- Auth config: [src/integrations/auth/config.ts](src/integrations/auth/config.ts)
- Drizzle schema: [src/integrations/drizzle/schema.ts](src/integrations/drizzle/schema.ts)

---

**Database Documentation**
- Engine: PostgreSQL (pg driver) — configured via `DATABASE_URL`.
- ORM: Drizzle ORM (`drizzle-orm` + Drizzle schema at [src/integrations/drizzle/schema.ts](src/integrations/drizzle/schema.ts)).

Primary tables (summarized):
- `user` — application users
  - Purpose: store user profiles and account flags
  - Fields: `id`, `image`, `name`, `email`, `emailVerified`, `username`, `displayUsername`, `twoFactorEnabled`, `lastActiveAt`, `role`, `banned`, `banReason`, `banExpires`, `createdAt`, `updatedAt`
  - Indexes: createdAt, email lower-case unique
  - Relations: has many `session`, `account`, `two_factor`, `passkey`, `resume`, `apikey`, `oauthClient`, `oauthRefreshToken`, `oauthAccessToken`, `oauthConsent`
- `session` — user sessions for Better Auth
  - Fields: `id`, `token`, `ipAddress`, `userAgent`, `impersonatedBy`, `userId`, `expiresAt`, `createdAt`, `updatedAt`
  - Relations: belongs to `user`
- `account` — external provider accounts & credentials
  - Fields: `id`, `accountId`, `providerId`, `userId`, `scope`, `idToken`, `password`, `accessToken`, `refreshToken`, ...
  - Relations: user (cascade on delete)
- `verification` — short-lived verification tokens (email, reset)
- `two_factor` — TOTP/2FA secrets + backup codes
- `passkey` — WebAuthn publicKey credentials
- `resume` — central resume record
  - Fields: `id`, `name`, `slug`, `tags`, `isPublic`, `isLocked`, `password`, `data` (jsonb typed as `ResumeData`), `userId`, `createdAt`, `updatedAt`
  - Relations: belongs to `user`; has one `resume_statistics`, has one `resume_analysis`
  - Indexes: unique slug per user, userId, createdAt, userId/updatedAt, isPublic/slug/userId
- `resume_statistics` — tracking views & downloads per resume
  - Fields: `id`, `views`, `downloads`, `lastViewedAt`, `lastDownloadedAt`, `resumeId`, `createdAt`, `updatedAt`
- `resume_analysis` — AI or analysis metadata stored as JSON
- `apikey` — API keys for programmatic access, with rate-limiting fields
- `jwks`, `oauth_client`, `oauth_refresh_token`, `oauth_access_token`, `oauth_consent` — tables to support OAuth / OIDC flows when `better-auth` oauth provider is used.

Text-based ERD summary:
- `user` (1) — (N) `resume`
- `resume` (1) — (1) `resume_statistics`
- `resume` (1) — (1) `resume_analysis`
- `user` (1) — (N) `session`
- `user` (1) — (N) `account`
- `user` (1) — (N) `two_factor`
- `user` (1) — (N) `passkey`
- `user` (1) — (N) `apikey`
- `oauth_client` (1) — (N) `oauth_refresh_token`
- `oauth_client` (1) — (N) `oauth_access_token`

Migrations: located under `migrations/` (timestamped folders). Use `drizzle-kit` scripts: `pnpm db:migrate`, `pnpm db:generate`.

Seed data: none committed as large seeds — data is created via sign-up flows and API.

---

**Authentication & Authorization**
- Provider: `better-auth` configured in `src/integrations/auth/config.ts`.
- Supported login methods: email+password, OAuth (Google, GitHub, LinkedIn, custom), Passkeys (WebAuthn), Two-factor (TOTP), API keys, session tokens, JWT for some flows.
- Password hashing: uses `hashPassword` / `verifyPassword` helpers in `src/utils/password` (bcrypt).
- Sessions: `session` table stores session tokens and expiry; client and server access via `authClient` and middleware.
- OAuth & OAuth Provider: `better-auth`'s `oauthProvider` plugin is configured to allow acting as an OAuth authorization server; dynamic client registration allowed with restricted redirect URIs.
- Role-based access control: `better-auth`'s `admin()` plugin is enabled; `role` field exists on `user` with default `user`.
- Protected routes: oRPC `protectedProcedure` ensures `context.user` presence (see `src/integrations/orpc/context.ts`).

Login flow (high-level):
1. User visits `/auth/login` page (see [src/routes/auth/login.tsx](src/routes/auth/login.tsx)).
2. Frontend calls `authClient` or submits form to `/api/auth/*` endpoints provided by `better-auth` (server handlers mapped in `src/routes/api/auth.$.ts`).
3. Server authenticates credentials via `better-auth` plugin `emailAndPassword` (password hashing, verification), or via OAuth redirect flow for providers.
4. On success, `better-auth` issues a session cookie or token and populates `session` table; `getSession()` helpers fetch the session on server and client (see [src/integrations/auth/functions.ts](src/integrations/auth/functions.ts)).
5. Protected oRPC calls use `protectedProcedure` that expects the auth context.

Password reset / verification:
- Password reset emails sent via `sendEmail` using templates under `src/integrations/email/templates`. Reset tokens are persisted in `verification` table.

Passkeys and 2FA:
- Passkeys supported via `@better-auth/passkey`; backup codes and TOTP handled via `twoFactor` table.

Security notes: `better-auth` handles many best-practices; application enforces redirect allowlists, uses secure cookies when app URL is HTTPS, and validates OAuth redirect URIs in hooks.

---

**Features (mapping)**
The site is organized with file-based routes under `src/routes`. Key features and where to find them:
- Authentication
  - Frontend: [src/routes/auth/*](src/routes/auth/index.tsx)
  - Server/API: `better-auth` handlers and oRPC `auth` router ([src/integrations/orpc/router/auth.ts](src/integrations/orpc/router/auth.ts))
  - DB: `user`, `session`, `account`, `two_factor`, `passkey`
- Dashboard
  - Frontend: [src/routes/dashboard/*](src/routes/dashboard/index.tsx)
  - Pages: settings, resumes, job-search, AI settings
- Resume Builder / Editor
  - Frontend: [src/routes/builder/$resumeId/*](src/routes/builder/$resumeId/index.tsx)
  - Components: resume templates in [src/components/resume/templates](src/components/resume/templates)
  - State: resume store at [src/components/resume/store/resume.ts](src/components/resume/store/resume.ts)
  - DB: `resume` table, `resume_statistics`, `resume_analysis`
- Resume Preview & PDF
  - Preview: [src/components/resume/preview.tsx](src/components/resume/preview.tsx)
  - Printer route: [src/routes/printer/$resumeId.tsx](src/routes/printer/$resumeId.tsx)
  - PDF generation: `src/integrations/orpc/services/printer.ts`
  - Storage: upload via storage service
- Resume Import/Export
  - Importers: `src/integrations/import/*` (JSON, resume v4, etc.)
  - Export: PDF via printer service; shareable public URLs via `resume.isPublic`
- AI Features
  - AI integration services: [src/integrations/ai/*] with prompts and tools (tailor, patch-resume)
  - oRPC AI router and services exist under `src/integrations/orpc/router/ai.ts` and `src/integrations/orpc/services/ai.ts` (summarized)
- Job Search Integration
  - Providers and store under `src/integrations/jobs/*`
- Localization
  - Locale files under `locales/` and `src/utils/locale.ts` integration
- Admin & OAuth Provider
  - Admin plugin via `better-auth/admin()`
  - OAuth authorization server endpoints under `/.well-known/*` and OAuth tables

---

**Frontend Architecture & Components**
- Folder structure (high level):
  - `src/routes` — file-based routes (pages)
  - `src/components` — shared UI primitives, layout, resume templates
  - `src/integrations` — API clients, services, adapters
  - `src/schema` — Zod schemas and types for resume data, templates, pages
  - `src/utils` — helpers (env, theme, locale, string utils)
  - `src/styles` — global styles and Tailwind config
- Routing: `src/routeTree.gen.ts` is auto-generated; router created in [src/router.tsx](src/router.tsx). Route files implement pages and handlers.
- Shared components: UI primitives under `src/components/ui/` (button, dropdown, dialog), layout screens under `src/components/layout/` (error-screen, loading-screen, not-found-screen).
- Resume templates: multiple template components under `src/components/resume/templates/*` — each template renders a resume data JSON to a visual layout.
- State & hooks:
  - Server state via TanStack Query (see `src/integrations/query/client.ts`)
  - Client state via `zustand` stores for resume editing and UI components (see resume store)
  - Custom hooks in `src/hooks/` and component-specific hooks (`src/components/resume/hooks/use-webfonts.tsx`)

**Key reusable components**
- UI primitives: `button`, `input`, `combobox`, `dialog`, `popover`, `dropdown-menu` (under `src/components/ui/`).
- Layout: `header`, `sidebar`, `footer` located in route-specific `-components` folders and `src/components/layout`.
- Resume components: `page-summary`, `page-section`, `page-picture`, `preview`, `get-section-component` (map resume sections to UI components).

---

**Backend Architecture (request lifecycle)**
- Entry: server bootstraps via Vite+/Nitro and TanStack Start; `getRouter` is used server-side to hydrate route context.
- Request -> routing in `src/routes` (some routes implement API handlers directly for `/.well-known/*`, `schema.json`, and `api/*`).
- oRPC: typed RPCs mounted under `/api/rpc/*` with routers defined in `src/integrations/orpc/router` and context constructed in `src/integrations/orpc/context.ts` (provides `db`, `orpc` client, `auth` context, rate-limit metadata).
- Services: route handlers call service functions in `src/integrations/orpc/services` which perform DB operations via Drizzle and use storage/email/AI providers.
- DB: Drizzle client at `src/integrations/drizzle/client.ts` executes queries; migrations in `migrations/`.
- Response: services return typed results or ORPCError errors that propagate to client via oRPC client helpers.

---

**API Documentation (high level)**
- oRPC base: `/api/rpc/*` — see router index [src/integrations/orpc/router/index.ts](src/integrations/orpc/router/index.ts). Available route groups: `ai`, `auth`, `flags`, `jobs`, `printer`, `resume`, `statistics`, `storage`.
- Example endpoints (oRPC mapping -> REST equivalents handled by `publicProcedure`/`protectedProcedure` wrappers):
  - `auth.providers.list` — GET `/auth/providers` (public)
  - `auth.deleteAccount` — DELETE `/auth/account` (protected)
  - `printer.printResumeAsPDF` — prints a resume PDF (i.e., backend service call exposed via oRPC `printer.printResumeAsPDF`).
- Additional server routes: `/.well-known/*` (OpenID/OAuth), `/schema.json`, `/api/health` (routes under `src/routes/api`).
- Frontend pages call the oRPC client generated by `src/integrations/orpc/client.ts` (see [src/integrations/orpc/client.ts](src/integrations/orpc/client.ts)).

For exact signatures and payloads: inspect `src/integrations/orpc/router/*` files which define `publicProcedure`/`protectedProcedure` routes, HTTP method, path, and expected inputs/outputs.

---

**Third-Party Integrations**
- Better Auth: authentication provider and OAuth server. (`better-auth` family)
- Browserless / Puppeteer (`puppeteer-core`): PDF/screenshot generation (PRINTER_ENDPOINT)
- AWS S3 (`@aws-sdk/client-s3`): for production storage of uploads (optional)
- AI SDKs: `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/anthropic` and `ai` wrapper for multi-provider AI features.
- Job search providers: pluggable under `src/integrations/jobs/providers` (e.g., jsearch)
- Email: `nodemailer` and `react-email` templates.
- Analytics/telemetry: Better Auth dash optionally via `BETTER_AUTH_API_KEY`.

Integration details and environment variables are documented in the Environment Configuration section below.

---

**Environment Configuration**
Key env vars (non-exhaustive; check `src/utils/env.ts` or `.env.example`):
- `APP_URL` — origin for the app
- `DATABASE_URL` — Postgres connection
- `PRINTER_ENDPOINT` — Browserless/Chrome endpoint for `puppeteer-core`
- `PRINTER_APP_URL` — host that Browserless uses to reach the app (when running in Docker)
- `BETTER_AUTH_SECRET` — secret used by Better Auth
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth providers
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
- `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET` — custom OAuth provider
- `AWS_S3_*` — S3 config when using S3 storage
- `BETTER_AUTH_API_KEY` — optional dashboard integration key

Development commands (Vite+):
```bash
vp install
vp dev
vp build
vp preview
vp test
pnpm db:migrate
``` 
(Use `vp` CLI as recommended by the repo. See `package.json` scripts.)

Docker notes: use compose files `compose.dev.yml` and `compose.yml` to start Postgres and Browserless. See project README.

---

**Security Review (concise)**
- Strengths:
  - `better-auth` covers many auth best practices (password hashing, session storage, passkeys, 2FA, JWT plugin, admin plugin).
  - OAuth redirect whitelist and validation done in hooks prior to dynamic client registration.
  - Drizzle typed queries reduce risk of SQL injection when used properly.
  - ORPCError used for structured server errors.
- Weaknesses / potential concerns:
  - Secrets in env must be managed carefully (no KMS integration described here).
  - Rate limiting is implemented, but review of strategy for public endpoints (e.g., resume preview) is recommended.
  - File upload validation and content-type enforcement should be audited; storage service supports S3/file system — ensure sensible ACLs and bucket policies.
  - XSS: templates and rich inputs must be sanitized (dompurify is present as a dependency). Ensure user content rendered in templates uses proper sanitization.

---

**Performance Review (concise)**
- Frontend bundle size: use Vite+ and code-splitting; templates and large UI components appear modular.
- SSR & caching: TanStack Query + router SSR integration provides good server-side rendering and caching hooks.
- PDF generation: puppeteer-based rendering is resource-heavy; system uses a Browserless endpoint and deduplicates concurrent print jobs to save resources.
- DB queries: Drizzle queries are explicit; indexes exist for common access patterns (resumes by user, slug uniqueness, statistics). Monitor slow queries around resume preview and search.
- Suggestions: enable CDN for static assets, cache resume previews where appropriate, and monitor the Browserless pool size.

---

**Code Quality Review (concise)**
- Overall: organized folder structure, modular services, strong typing across stack.
- Patterns: consistent use of TanStack router file-based routing and Drizzle for typed DB schema.
- Minor issues to check:
  - Ensure `routeTree.gen.ts` is ignored from formatting and not manually edited (it's auto-generated).
  - Keep long service functions (e.g., printer) well-tested due to complexity.
  - Validate test coverage for critical flows (auth, storage, printer). There are tests present for several components.

---

**Folder Structure Documentation**
- Top-level: `src/` contains primary code. Notable folders:
  - `src/routes` — pages & API route handlers
  - `src/components` — UI components & templates
  - `src/integrations` — backend integrations & services
  - `migrations/` — DB migrations
  - `locales/` — i18n message catalogs
  - `docs/`, `public/`, `scripts/`

---

**Data Flow & Request Lifecycle**
- Frontend user action -> React page component -> client-side oRPC or REST call -> server route / oRPC context -> service -> db/storage/email -> response -> client update (TanStack Query cache invalidation as required).
- Resume PDF flow: user triggers print -> backend `printerService.printResumeAsPDF` retrieves resume data -> generate printer token -> instruct Browserless to render `/printer/{resumeId}` -> puppeteer captures PDF -> uploaded to storage -> URL returned to caller.

---

**Overall Assessment & Areas for Improvement**
- The codebase is mature, well-modularized, and uses modern TypeScript patterns.
- Recommended documentation improvements (non-code):
  - Add an architecture diagram (Mermaid) summarizing request flow and interactions with Browserless/S3.
  - Document key environment variables in `.env.example` clearly labeled for dev vs production.
  - Add an operations guide for scaling Browserless (pooling) and Postgres tuning for resume-heavy workloads.
  - Add security checklist for operators to follow when self-hosting (cookie settings, OAuth client registration process, S3 permissions, secret rotation).

---

**Where to look first (onboarding plan)**
1. Read `README.md` and run `vp dev` locally (with Postgres + Browserless via Docker if needed).
2. Explore `src/routes` to learn the user-facing pages.
3. Inspect `src/components/resume/templates` to understand rendering and PDF issues.
4. Read `src/integrations/drizzle/schema.ts` to understand DB shape.
5. Read `src/integrations/auth/config.ts` to understand authentication flows.
6. Explore `src/integrations/orpc/router` and `services` to learn server features.

---

If you want, I can now:
- Expand the API section into a full endpoint-by-endpoint reference (auto-extracted from `src/integrations/orpc/router`).
- Produce a per-table DB reference (detailed columns + types and which endpoints use each table).
- Generate a Mermaid ERD diagram file.

Tell me which of the above you want next, and I'll continue producing the requested expansion and the `docs/` artifacts.
