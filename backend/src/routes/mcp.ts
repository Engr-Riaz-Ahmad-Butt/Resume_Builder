import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";

import { auth, authBaseUrl, verifyOAuthToken } from "@/integrations/auth/config";
import { createMcpServer } from "@/integrations/mcp/server";
import { runWithMcpRequestHeaders } from "@/integrations/mcp/request-context";

/**
 * FLAG(M09/M12): MCP gate accepts MCP OAuth Bearer (`verifyOAuthToken`) or `x-api-key` only.
 * Do not accept user JWTs here — that is the oRPC dual-Bearer path.
 */
class AuthError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

async function authenticateRequest(request: Request): Promise<void> {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyOAuthToken(authHeader.slice(7));
      if (payload?.sub) return;
    } catch {
      // Invalid or expired token — fall through
    }
  }

  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    try {
      const result = await auth.api.verifyApiKey({ body: { key: apiKey } });
      if (result.valid) return;
    } catch {
      // Invalid key — fall through
    }
  }

  throw new AuthError();
}

async function handleMcp(request: Request): Promise<Response> {
  try {
    await authenticateRequest(request);

    return await runWithMcpRequestHeaders(request.headers, async () => {
      const server = createMcpServer();
      const transport = new WebStandardStreamableHTTPServerTransport({
        enableJsonResponse: true,
      });
      await server.connect(transport);
      return await transport.handleRequest(request);
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { id: null, jsonrpc: "2.0", error: { code: -32603, message: "Unauthorized" } },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": `Bearer resource_metadata="${authBaseUrl}/.well-known/oauth-protected-resource"`,
          },
        },
      );
    }

    console.error("[MCP]", error);
    return Response.json({
      id: null,
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: `Error handling request: ${error instanceof Error ? error.message : String(error)}`,
      },
    });
  }
}

export const mcpRoutes = new Hono()
  .all("/", (c) => handleMcp(c.req.raw))
  .all("/*", (c) => handleMcp(c.req.raw));
