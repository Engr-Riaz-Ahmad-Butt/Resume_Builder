import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });

import { serve } from "@hono/node-server";

import { app } from "./app.js";
import { logger } from "./lib/logger.js";
import { registerSignalHandlers } from "./lib/shutdown.js";

const port = Number(process.env.PORT ?? 3001);

const server = serve({ fetch: app.fetch, port }, (info) => {
  logger.info({ port: info.port }, "backend listening");
});

registerSignalHandlers(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

export { app };
