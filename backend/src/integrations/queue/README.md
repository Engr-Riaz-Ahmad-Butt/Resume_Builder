# Queue (BullMQ)

PoC queue wiring for the extracted backend (M13).

## Ping job

- Queue name: `ping`
- Enqueue via oRPC `queue.enqueuePing({ message })` (protected)
- Worker inserts a row into Postgres table `queue_ping`
- Worker starts with the API process (`src/index.ts`) and drains on `SIGTERM`/`SIGINT`

## Local / CI

Uses `REDIS_URL` (test suite uses Redis DB index `15` and `FLUSHDB` in `beforeEach`).

```bash
pnpm --dir backend test -- src/integrations/queue/ping.test.ts
```

## Notes

- BullMQ connections use `maxRetriesPerRequest: null` (separate from the shared `ioredis` client used for rate limits / cache).
- Graceful shutdown closes the ping worker, then queue, then Redis connections via `onShutdown` hooks.
