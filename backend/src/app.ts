import { Hono } from "hono";

import type { RequestIdVariables } from "./middleware/request-id.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.js";
import { healthRoutes } from "./routes/health.js";

/**
 * Exported Hono app (no listen). Used by the Node server and by tests via `app.request`.
 */
export const app = new Hono<{ Variables: RequestIdVariables }>();

app.use("*", requestIdMiddleware);
app.use("*", securityHeadersMiddleware);
app.route("/", healthRoutes);

app.notFound((c) => c.json({ error: "Not Found" }, 404));

app.onError((err, c) => {
  const requestLogger = c.get("logger");
  requestLogger?.error({ err }, "unhandled error");
  return c.json({ error: "Internal Server Error", requestId: c.get("requestId") }, 500);
});
