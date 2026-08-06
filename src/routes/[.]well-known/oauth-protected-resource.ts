import { createFileRoute } from "@tanstack/react-router";

import { authClient } from "@/integrations/auth/client";
import { authBaseUrl } from "@/integrations/auth/config";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: async () => {
        const metadata = await authClient.getProtectedResourceMetadata({
          resource: authBaseUrl,
          bearer_methods_supported: ["header"],
          authorization_servers: [authBaseUrl, `${authBaseUrl}/api/auth`],
        });

        return Response.json(metadata, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
          },
        });
      },
    },
  },
});
