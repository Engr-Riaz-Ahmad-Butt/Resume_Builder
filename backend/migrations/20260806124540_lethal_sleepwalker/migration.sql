CREATE TABLE "queue_ping" (
	"id" uuid PRIMARY KEY,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
