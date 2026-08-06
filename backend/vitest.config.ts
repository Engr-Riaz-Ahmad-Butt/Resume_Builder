import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    pool: "forks",
    fileParallelism: false,
    globalSetup: ["./src/test/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5433/postgres",
      REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6380/15",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "test-auth-secret-for-vitest-only",
      APP_URL: process.env.APP_URL ?? "http://127.0.0.1:3001",
    },
  },
});
