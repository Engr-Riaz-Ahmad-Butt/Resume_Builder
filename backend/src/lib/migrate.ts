import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(here, "../../migrations");

export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });
  try {
    const db = drizzle({ client: pool });
    await migrate(db, { migrationsFolder });
  } finally {
    await pool.end();
  }
}
