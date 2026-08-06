import type { User } from "better-auth";

import { ORPCError, os } from "@orpc/server";
import { eq } from "drizzle-orm";

import type { Locale } from "@/utils/locale";

import { auth, verifyOAuthToken, verifyUserJwt } from "../auth/config";
import { db } from "../drizzle/client";
import { user } from "../drizzle/schema";

interface ORPCContext {
  locale: Locale;
  reqHeaders?: Headers;
}

/**
 * FLAG(M09): Dual Bearer verification —
 * 1) User JWT (Better Auth jwt plugin) via verifyUserJwt
 * 2) MCP OAuth access token via verifyOAuthToken
 * Try user JWT first; fall back to MCP OAuth JWT.
 */
async function getUserFromBearerToken(headers: Headers): Promise<User | null> {
  try {
    const authHeader = headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);

    let sub: string | undefined;
    try {
      const userPayload = await verifyUserJwt(token);
      sub = typeof userPayload.sub === "string" ? userPayload.sub : undefined;
    } catch {
      const oauthPayload = await verifyOAuthToken(token);
      sub = typeof oauthPayload.sub === "string" ? oauthPayload.sub : undefined;
    }

    if (!sub) return null;
    const [userResult] = await db.select().from(user).where(eq(user.id, sub)).limit(1);
    return userResult ?? null;
  } catch (error) {
    console.warn("Bearer token verification failed:", error);
    return null;
  }
}

async function getUserFromHeaders(headers: Headers): Promise<User | null> {
  try {
    const result = await auth.api.getSession({ headers });
    if (!result || !result.user) return null;

    return result.user;
  } catch (error) {
    console.warn("Session verification failed:", error);
    return null;
  }
}

async function getUserFromApiKey(apiKey: string): Promise<User | null> {
  try {
    const result = await auth.api.verifyApiKey({ body: { key: apiKey } });
    if (!result.key || !result.valid) return null;

    const [userResult] = await db
      .select()
      .from(user)
      .where(eq(user.id, result.key.referenceId))
      .limit(1);
    if (!userResult) return null;

    return userResult;
  } catch (error) {
    console.warn("API key verification failed:", error);
    return null;
  }
}

/**
 * Resolve the authenticated user from the same headers oRPC uses (`x-api-key`, `Authorization: Bearer`, or session cookies).
 */
export async function resolveUserFromRequestHeaders(headers: Headers): Promise<User | null> {
  const apiKey = headers.get("x-api-key");
  if (apiKey) {
    const resolved = await getUserFromApiKey(apiKey);
    if (resolved) return resolved;
  } else {
    const resolved = await getUserFromBearerToken(headers);
    if (resolved) return resolved;
  }

  return (await getUserFromHeaders(headers)) ?? null;
}

const base = os.$context<ORPCContext>();

export const publicProcedure = base.use(async ({ context, next }) => {
  const headers = context.reqHeaders ?? new Headers();
  const apiKey = headers.get("x-api-key");

  const resolvedUser = apiKey
    ? await getUserFromApiKey(apiKey)
    : ((await getUserFromBearerToken(headers)) ?? (await getUserFromHeaders(headers)));

  return next({
    context: {
      ...context,
      user: resolvedUser ?? null,
    },
  });
});

export const protectedProcedure = publicProcedure.use(async ({ context, next }) => {
  if (!context.user) throw new ORPCError("UNAUTHORIZED");

  return next({
    context: {
      ...context,
      user: context.user,
    },
  });
});
