# Backend test isolation (LOCKED)

## Strategy: truncate / flush in `beforeEach`

| Store    | Helper                            | Behavior                                                                                         |
| -------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Postgres | `reset-db.ts` → `resetDb()`       | `TRUNCATE … RESTART IDENTITY CASCADE` on all `public` tables except drizzle migrator bookkeeping |
| Redis    | `reset-redis.ts` → `resetRedis()` | `FLUSHDB` on the configured Redis DB index                                                       |

## Rules

1. **No ad-hoc teardown** — do not `DELETE FROM resume` in one suite and use transactions in another.
2. Call these helpers (or a shared Vitest setup that invokes them) from **`beforeEach`**.
3. Migrations run **once** per Vitest run via `globalSetup` (`src/test/global-setup.ts`), not per test.
4. Use a **dedicated Redis DB index** for tests (CI uses `/15`). Never point tests at production Redis.

## Why not transaction rollback?

Better Auth, storage, and BullMQ workers often use separate pool connections / commits; an outer test transaction will not see or roll back those writes → false greens and cross-test leaks.
