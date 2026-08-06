import { logger } from "./logger.js";

export type ShutdownHook = () => Promise<void> | void;

const hooks: ShutdownHook[] = [];
let shuttingDown = false;

/** Register a resource closer (DB pool, Redis, BullMQ workers). Safe to call before listen. */
export function onShutdown(hook: ShutdownHook): void {
  hooks.push(hook);
}

export function isShuttingDown(): boolean {
  return shuttingDown;
}

/**
 * Graceful shutdown skeleton: stop accepting → await in-flight hooks → exit.
 * DB/Redis close hooks are wired in M02; BullMQ workers in M13.
 */
export function registerSignalHandlers(closeServer: () => Promise<void>): void {
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "graceful shutdown started");

    try {
      await closeServer();
      for (const hook of hooks) {
        await hook();
      }
      logger.info("graceful shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "graceful shutdown failed");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}
