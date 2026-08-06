import { runMigrations } from "../lib/migrate.js";

export default async function globalSetup(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for backend tests (set in CI or local .env.test)");
  }
  await runMigrations(databaseUrl);
}
