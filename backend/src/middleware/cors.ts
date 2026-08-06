import { cors } from "hono/cors";

import { env } from "@/lib/env";

function allowedOrigins(): string[] {
  const origins = new Set<string>();
  if (env.FRONTEND_ORIGIN) origins.add(env.FRONTEND_ORIGIN.replace(/\/$/, ""));
  origins.add(new URL(env.APP_URL).origin);
  return [...origins];
}

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return allowedOrigins()[0] ?? env.APP_URL;
    const normalized = origin.replace(/\/$/, "");
    return allowedOrigins().includes(normalized) ? normalized : "";
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Api-Key", "X-Request-Id"],
  exposeHeaders: ["X-Request-Id", "set-auth-jwt", "set-auth-token"],
  credentials: true,
});
