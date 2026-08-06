import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Backend server env. M02: DATABASE_URL + REDIS_URL required.
 * Additional vars are added as modules land (auth, printer, etc.).
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    LOG_LEVEL: z.string().optional(),
    DATABASE_URL: z.url({ protocol: /postgres(ql)?/ }),
    REDIS_URL: z.url({ protocol: /rediss?/ }),
    AUTH_SECRET: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
