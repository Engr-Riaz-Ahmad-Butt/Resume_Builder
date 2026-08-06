import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from "@better-auth/oauth-provider";
import { Hono } from "hono";

import { auth, authBaseUrl } from "@/integrations/auth/config";
import { buildMcpServerCard } from "@/integrations/mcp/helpers/mcp-server-card";
import { MCP_SERVER_VERSION } from "@/integrations/mcp/server";

const authServerMetadata = oauthProviderAuthServerMetadata(auth);
const openIdConfigMetadata = oauthProviderOpenIdConfigMetadata(auth);

const cacheHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
} as const;

export const wellKnownRoutes = new Hono()
  .get("/.well-known/oauth-protected-resource", (c) => {
    const metadata = {
      resource: authBaseUrl,
      authorization_servers: [authBaseUrl, `${authBaseUrl}/api/auth`],
      bearer_methods_supported: ["header"],
    };
    return c.json(metadata, 200, cacheHeaders);
  })
  .get("/.well-known/oauth-protected-resource/*", (c) => {
    const metadata = {
      resource: authBaseUrl,
      authorization_servers: [authBaseUrl, `${authBaseUrl}/api/auth`],
      bearer_methods_supported: ["header"],
    };
    return c.json(metadata, 200, cacheHeaders);
  })
  .get("/.well-known/oauth-authorization-server", (c) => authServerMetadata(c.req.raw))
  .get("/.well-known/oauth-authorization-server/*", (c) => authServerMetadata(c.req.raw))
  .get("/.well-known/openid-configuration", (c) => openIdConfigMetadata(c.req.raw))
  .get("/.well-known/mcp/server-card.json", (c) =>
    c.json(buildMcpServerCard(MCP_SERVER_VERSION), 200, {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
    }),
  )
  .get("/.well-known/*", (c) => c.text("OK", 200))
  .on("HEAD", "/.well-known/*", (c) => c.text("OK", 200));
