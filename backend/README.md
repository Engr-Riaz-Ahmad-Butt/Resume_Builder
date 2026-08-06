# Backend (API only)

Standalone **Hono + oRPC** API for Reactive Resume.

## Tooling choices

| Concern     | Choice                                           |
| ----------- | ------------------------------------------------ |
| Runtime     | Node `>=20.19.0` (see root `.nvmrc`)             |
| HTTP        | Hono (`@hono/node-server`)                       |
| Logging     | **pino** (+ `pino-pretty` in non-production)     |
| Lint        | **Oxlint**                                       |
| Format      | **Prettier**                                     |
| Tests       | **Vitest** (`app.request` + integration helpers) |
| DB          | Drizzle ORM (PostgreSQL)                         |
| Cache/Queue | Redis (`ioredis`)                                |

## Scripts

```bash
pnpm --dir backend dev
pnpm --dir backend typecheck
pnpm --dir backend lint
pnpm --dir backend format
pnpm --dir backend test
pnpm --dir backend db:migrate
```

## Health

`GET /api/health` pings Postgres + Redis and returns `ok` / `unhealthy`.

## Test isolation

See [`src/test/README.md`](./src/test/README.md) — truncate Postgres + `FLUSHDB` Redis in `beforeEach`.
