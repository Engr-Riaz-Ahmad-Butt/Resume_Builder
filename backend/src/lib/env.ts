import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Backend server env.
 * Auth-related vars added in M05; printer/AI/storage vars land in later modules.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    LOG_LEVEL: z.string().optional(),
    DATABASE_URL: z.url({ protocol: /postgres(ql)?/ }),
    REDIS_URL: z.url({ protocol: /rediss?/ }),
    AUTH_SECRET: z.string().min(1),
    APP_URL: z.url({ protocol: /https?/ }),
    // Prefer FRONTEND_ORIGIN for CORS/consent in M09; until then APP_URL doubles as origin.
    FRONTEND_ORIGIN: z.url({ protocol: /https?/ }).optional(),

    BETTER_AUTH_API_KEY: z.string().min(1).optional(),

    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    LINKEDIN_CLIENT_ID: z.string().min(1).optional(),
    LINKEDIN_CLIENT_SECRET: z.string().min(1).optional(),

    OAUTH_PROVIDER_NAME: z.string().min(1).optional(),
    OAUTH_CLIENT_ID: z.string().min(1).optional(),
    OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
    OAUTH_DISCOVERY_URL: z.url({ protocol: /https?/ }).optional(),
    OAUTH_AUTHORIZATION_URL: z.url({ protocol: /https?/ }).optional(),
    OAUTH_TOKEN_URL: z.url({ protocol: /https?/ }).optional(),
    OAUTH_USER_INFO_URL: z.url({ protocol: /https?/ }).optional(),
    OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS: z.string().optional(),
    OAUTH_SCOPES: z
      .string()
      .min(1)
      .transform((value) => value.split(" "))
      .default(["openid", "profile", "email"]),

    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    SMTP_FROM: z.string().min(1).optional(),
    SMTP_SECURE: z.stringbool().default(false),

    FLAG_DISABLE_SIGNUPS: z.stringbool().default(false),
    FLAG_DISABLE_EMAIL_AUTH: z.stringbool().default(false),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
