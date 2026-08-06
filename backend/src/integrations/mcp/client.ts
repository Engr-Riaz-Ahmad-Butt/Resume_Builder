import { onError } from "@orpc/client";
import { createRouterClient, type RouterClient } from "@orpc/server";

import router from "@/integrations/orpc/router";
import { getLocale } from "@/utils/locale";

import { getMcpRequestHeaders } from "./request-context";

/** In-process oRPC client that forwards the current MCP request headers into procedure context. */
export const client: RouterClient<typeof router> = createRouterClient(router, {
  interceptors: [
    onError((error) => {
      console.error("[oRPC MCP]", error);
    }),
  ],
  context: async () => ({
    locale: await getLocale(),
    reqHeaders: getMcpRequestHeaders(),
  }),
});
