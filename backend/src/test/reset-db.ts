import { sql } from "drizzle-orm";

import { getDb } from "../integrations/drizzle/client.js";

/**
 * Truncate all application tables in `public` (RESTART IDENTITY CASCADE).
 *
 * LOCKED isolation strategy (plan M02): call from `beforeEach` in every DB-backed
 * integration test. Do not invent per-module teardown.
 *
 * Skips drizzle migrator bookkeeping tables.
 */
export async function resetDb(): Promise<void> {
  const db = getDb();
  await db.execute(sql`
    DO $$
    DECLARE
      stmt text;
    BEGIN
      SELECT coalesce(
        string_agg(format('TRUNCATE TABLE %I.%I RESTART IDENTITY CASCADE', schemaname, tablename), '; '),
        'SELECT 1'
      )
      INTO stmt
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT IN ('__drizzle_migrations', 'drizzle_migrations')
        AND tablename NOT LIKE 'pg_%';

      EXECUTE stmt;
    END $$;
  `);
}
