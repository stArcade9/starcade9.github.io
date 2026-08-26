CREATE TYPE "public"."experience_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "chapter_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"progress_id" uuid NOT NULL,
	"chapter_id" text NOT NULL,
	"completion_id" text NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapter_completions_progress_chapter_key" UNIQUE("progress_id","chapter_id"),
	CONSTRAINT "chapter_completions_progress_completion_key" UNIQUE("progress_id","completion_id")
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_token" text NOT NULL,
	"seed" integer NOT NULL,
	"story_id" text NOT NULL,
	"status" "experience_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experiences_public_token_key" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"visitor_id" uuid NOT NULL,
	"current_chapter_id" text NOT NULL,
	"next_unlock_at" timestamp with time zone,
	"first_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_experience_visitor_key" UNIQUE("experience_id","visitor_id")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket_key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "rate_limit_events_bucket_window_key" UNIQUE("bucket_key","window_start")
);
--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signed_identifier" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visitors_signed_identifier_key" UNIQUE("signed_identifier")
);
--> statement-breakpoint
ALTER TABLE "chapter_completions" ADD CONSTRAINT "chapter_completions_progress_id_progress_id_fk" FOREIGN KEY ("progress_id") REFERENCES "public"."progress"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "progress_experience_id_idx" ON "progress" USING btree ("experience_id");