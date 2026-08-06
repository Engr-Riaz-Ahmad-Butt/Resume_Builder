CREATE TABLE IF NOT EXISTS "video_analysis" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"upload_status" text DEFAULT 'pending' NOT NULL,
	"storage_path" text,
	"mime_type" text,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"analysis_result" text,
	"professionalism" text,
	"energy_levels" text,
	"communication" text,
	"sociability" text,
	"overall_score" double precision,
	"video_score" double precision,
	"confidence_score" double precision,
	"clarity_score" double precision,
	"communication_score" double precision,
	"background_score" double precision,
	"needs_improvements" jsonb DEFAULT '[]',
	"detailed_analysis" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_analysis_user_id_index" ON "video_analysis" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_analysis_user_id_created_at_index" ON "video_analysis" ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "video_analysis" ADD CONSTRAINT "video_analysis_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
