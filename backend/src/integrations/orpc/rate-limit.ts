/** oRPC rate limits backed by Redis (M13). */
import { createRatelimitMiddleware } from "@orpc/experimental-ratelimit";
import { RedisRatelimiter } from "@orpc/experimental-ratelimit/redis";

import { rateLimitConfig } from "@/integrations/rate-limit/config";
import { getRedis } from "@/lib/redis";

type ContextWithHeaders = {
  reqHeaders?: Headers;
  user?: { id: string } | null;
};

export const TRUSTED_IP_HEADERS = [
  "CF-Connecting-IP",
  "CF-Connecting-IPv6",
  "True-Client-IP",
  "X-Forwarded-For",
  "X-Real-IP",
];

function getTrustedIp(headers?: Headers): string | null {
  if (!headers) return null;

  for (const headerName of TRUSTED_IP_HEADERS) {
    const raw = headers.get(headerName)?.trim();
    if (!raw) continue;

    const ip = raw.split(",")[0]?.trim();
    if (!ip) continue;

    return ip;
  }

  return null;
}

function getClientKey(headers?: Headers): string {
  const trustedIp = getTrustedIp(headers);
  if (trustedIp) return `ip:${trustedIp}`;

  const userAgent = headers?.get("user-agent")?.trim() ?? "unknown";
  const language = headers?.get("accept-language")?.split(",")[0]?.trim() ?? "none";

  return `fp:${userAgent.slice(0, 64)}:${language.slice(0, 16)}`;
}

function getUserKey(context: ContextWithHeaders): string {
  return context.user?.id ?? "anon";
}

function getInputKeyPart(input: unknown): string {
  if (!input || typeof input !== "object") return "no-input";

  const inputRecord = input as Record<string, unknown>;
  const id = inputRecord.id;

  if (typeof id === "string" && id.trim()) return id;

  const username = inputRecord.username;
  const slug = inputRecord.slug;

  if (typeof username === "string" && typeof slug === "string") return `${username}:${slug}`;

  return "no-id";
}

function redisEval(script: string, numKeys: number, ...rest: string[]): Promise<unknown> {
  return getRedis().eval(script, numKeys, ...rest);
}

function createLimiter(options: { maxRequests: number; window: number }) {
  return new RedisRatelimiter({
    eval: redisEval,
    prefix: "orpc:ratelimit:",
    maxRequests: options.maxRequests,
    window: options.window,
  });
}

const resumePasswordLimiter = createLimiter(rateLimitConfig.orpc.resumePassword);
const pdfLimiter = createLimiter(rateLimitConfig.orpc.pdfExport);
const aiLimiter = createLimiter(rateLimitConfig.orpc.aiRequest);
const jobsSearchLimiter = createLimiter(rateLimitConfig.orpc.jobsSearch);
const jobsTestConnectionLimiter = createLimiter(rateLimitConfig.orpc.jobsTestConnection);
const storageUploadLimiter = createLimiter(rateLimitConfig.orpc.storageUpload);
const storageDeleteLimiter = createLimiter(rateLimitConfig.orpc.storageDelete);
const resumeMutationLimiter = createLimiter(rateLimitConfig.orpc.resumeMutations);

export const resumePasswordRateLimit = createRatelimitMiddleware<
  ContextWithHeaders,
  { username: string; slug: string }
>({
  limiter: resumePasswordLimiter,
  key: ({ context }, input) =>
    `resume-password:${input.username}:${input.slug}:${getClientKey(context.reqHeaders)}`,
});

export const pdfExportRateLimit = createRatelimitMiddleware<ContextWithHeaders, { id: string }>({
  limiter: pdfLimiter,
  key: ({ context }, input) => `pdf-export:${getUserKey(context)}:${input.id}`,
});

export const aiRequestRateLimit = createRatelimitMiddleware<
  ContextWithHeaders,
  { provider: string }
>({
  limiter: aiLimiter,
  key: ({ context }, input) => `ai-request:${getUserKey(context)}:${input.provider}`,
});

export const jobsSearchRateLimit = createRatelimitMiddleware<
  ContextWithHeaders,
  { params: { query: string } }
>({
  limiter: jobsSearchLimiter,
  key: ({ context }, input) =>
    `jobs-search:${getUserKey(context)}:${input.params.query.trim().toLowerCase()}`,
});

export const jobsTestConnectionRateLimit = createRatelimitMiddleware<
  ContextWithHeaders,
  { apiKey: string }
>({
  limiter: jobsTestConnectionLimiter,
  key: ({ context }) => `jobs-test-connection:${getUserKey(context)}`,
});

export const storageUploadRateLimit = createRatelimitMiddleware<ContextWithHeaders, unknown>({
  limiter: storageUploadLimiter,
  key: ({ context }) => `storage-upload:${getUserKey(context)}`,
});

export const storageDeleteRateLimit = createRatelimitMiddleware<
  ContextWithHeaders,
  { filename: string }
>({
  limiter: storageDeleteLimiter,
  key: ({ context }, input) => `storage-delete:${getUserKey(context)}:${input.filename}`,
});

export const resumeMutationRateLimit = createRatelimitMiddleware<ContextWithHeaders, unknown>({
  limiter: resumeMutationLimiter,
  key: ({ context }, input) => `resume-mutation:${getUserKey(context)}:${getInputKeyPart(input)}`,
});

/** Video uploads share the storage-upload budget (expensive Gemini multimodal). */
export const videoUploadRateLimit = createRatelimitMiddleware<ContextWithHeaders, unknown>({
  limiter: storageUploadLimiter,
  key: ({ context }) => `video-upload:${getUserKey(context)}`,
});
