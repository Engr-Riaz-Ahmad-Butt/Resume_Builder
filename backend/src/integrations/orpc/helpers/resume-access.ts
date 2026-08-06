import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

const RESUME_ACCESS_COOKIE_PREFIX = "resume_access";
const RESUME_ACCESS_TTL_SECONDS = 60 * 10; // 10 minutes

type CookieJar = {
  get: (name: string) => string | undefined;
  set: (name: string, value: string, options: Record<string, unknown>) => void;
};

/** Per-request cookie jar (set by RPC middleware). */
export const resumeAccessCookieStore = new AsyncLocalStorage<CookieJar>();

const getResumeAccessCookieName = (resumeId: string) =>
  `${RESUME_ACCESS_COOKIE_PREFIX}_${resumeId}`;

const signResumeAccessToken = (resumeId: string, passwordHash: string): string =>
  createHash("sha256").update(`${resumeId}:${passwordHash}`).digest("hex");

const safeEquals = (value: string, expected: string) => {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  if (valueBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(valueBuffer, expectedBuffer);
};

export const hasResumeAccess = (resumeId: string, passwordHash: string | null) => {
  if (!passwordHash) return false;
  const jar = resumeAccessCookieStore.getStore();
  if (!jar) return false;
  const cookieValue = jar.get(getResumeAccessCookieName(resumeId));
  if (!cookieValue) return false;
  const expected = signResumeAccessToken(resumeId, passwordHash);
  return safeEquals(cookieValue, expected);
};

export const grantResumeAccess = (resumeId: string, passwordHash: string) => {
  const jar = resumeAccessCookieStore.getStore();
  if (!jar) {
    // FLAG: no request cookie jar — password unlock cookie not persisted on this call path.
    return;
  }
  jar.set(getResumeAccessCookieName(resumeId), signResumeAccessToken(resumeId, passwordHash), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: RESUME_ACCESS_TTL_SECONDS,
    secure: env.APP_URL.startsWith("https"),
  });
};
