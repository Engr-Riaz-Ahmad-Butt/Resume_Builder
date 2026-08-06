import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import {
  BatchHandlerPlugin,
  RequestHeadersPlugin,
  StrictGetMethodPlugin,
} from "@orpc/server/plugins";
import { Hono } from "hono";

import router from "@/integrations/orpc/router";
import { getLocale } from "@/utils/locale";

const rpcHandler = new RPCHandler(router, {
  plugins: [new BatchHandlerPlugin(), new RequestHeadersPlugin(), new StrictGetMethodPlugin()],
  interceptors: [
    onError((error) => {
      console.error("[oRPC Server]", error);
    }),
  ],
});

export const rpcRoutes = new Hono().all("/*", async (c) => {
  const { response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/api/rpc",
    context: { locale: getLocale() },
  });

  if (!response) return c.text("NOT_FOUND", 404);
  return response;
});
