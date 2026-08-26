ALTER TABLE "progress" ALTER COLUMN "current_chapter_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "progress" ADD COLUMN "current_chapter_started_at" timestamp with time zone;