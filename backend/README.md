# Backend (API only)

Standalone **Hono + oRPC** API for Reactive Resume.

## Tooling choices (M01)

| Concern | Choice                                                                           |
| ------- | -------------------------------------------------------------------------------- |
| Runtime | Node `>=20.19.0` (see root `.nvmrc`)                                             |
| HTTP    | Hono (`@hono/node-server`)                                                       |
| Logging | **pino** (+ `pino-pretty` in non-production)                                     |
| Lint    | **Oxlint** (`oxlint`; type-aware disabled due to tsgolint panic on this version) |
| Format  | **Prettier**                                                                     |
| Tests   | **Vitest** (`app.request` against exported `app`)                                |

## Scripts

```bash
pnpm --dir backend dev
pnpm --dir backend typecheck
pnpm --dir backend lint
pnpm --dir backend format
pnpm --dir backend test
```

## Health

`GET /api/health` → `{ status: "ok", ... }` with `x-request-id` and security headers.
