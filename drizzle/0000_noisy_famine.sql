-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE IF NOT EXISTS "checkpoint_migrations" (
	"v" integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checkpoint_blobs" (
	"thread_id" text NOT NULL,
	"checkpoint_ns" text DEFAULT '' NOT NULL,
	"channel" text NOT NULL,
	"version" text NOT NULL,
	"type" text NOT NULL,
	"blob" "bytea",
	CONSTRAINT "checkpoint_blobs_pkey" PRIMARY KEY("thread_id","checkpoint_ns","channel","version")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checkpoints" (
	"thread_id" text NOT NULL,
	"checkpoint_ns" text DEFAULT '' NOT NULL,
	"checkpoint_id" text NOT NULL,
	"parent_checkpoint_id" text,
	"type" text,
	"checkpoint" jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "checkpoints_pkey" PRIMARY KEY("thread_id","checkpoint_ns","checkpoint_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checkpoint_writes" (
	"thread_id" text NOT NULL,
	"checkpoint_ns" text DEFAULT '' NOT NULL,
	"checkpoint_id" text NOT NULL,
	"task_id" text NOT NULL,
	"idx" integer NOT NULL,
	"channel" text NOT NULL,
	"type" text,
	"blob" "bytea" NOT NULL,
	CONSTRAINT "checkpoint_writes_pkey" PRIMARY KEY("thread_id","checkpoint_ns","checkpoint_id","task_id","idx")
);

*/