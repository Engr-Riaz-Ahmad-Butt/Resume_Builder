import type { Context, Next } from "hono";

import { logger } from "../lib/logger.js";
import { REQUEST_ID_HEADER, resolveRequestId } from "../lib/request-id.js";

export type RequestIdVariables = {
  requestId: string;
  logger: typeof logger;
};

export async function requestIdMiddleware(c: Context, next: Next): Promise<void> {
  const requestId = resolveRequestId(c.req.header(REQUEST_ID_HEADER));
  const requestLogger = logger.child({ requestId });

  c.set("requestId", requestId);
  c.set("logger", requestLogger);
  c.header(REQUEST_ID_HEADER, requestId);

  const started = Date.now();
  try {
    await next();
  } finally {
    requestLogger.info(
      {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Date.now() - started,
      },
      "request completed",
    );
  }
}
