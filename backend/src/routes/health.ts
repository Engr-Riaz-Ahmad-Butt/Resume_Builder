import { Hono } from "hono";

import type { RequestIdVariables } from "../middleware/request-id.js";

export const healthRoutes = new Hono<{ Variables: RequestIdVariables }>().get(
  "/api/health",
  (c) => {
    return c.json({
      status: "ok",
      service: "reactive-resume-backend",
      requestId: c.get("requestId"),
      timestamp: new Date().toISOString(),
    });
  },
);
