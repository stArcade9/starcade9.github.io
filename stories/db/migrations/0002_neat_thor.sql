ALTER TABLE "chapter_completions" DROP CONSTRAINT "chapter_completions_progress_id_progress_id_fk";
--> statement-breakpoint
ALTER TABLE "progress" DROP CONSTRAINT "progress_experience_id_experiences_id_fk";
--> statement-breakpoint
ALTER TABLE "progress" DROP CONSTRAINT "progress_visitor_id_visitors_id_fk";
--> statement-breakpoint
ALTER TABLE "chapter_completions" ADD CONSTRAINT "chapter_completions_progress_id_progress_id_fk" FOREIGN KEY ("progress_id") REFERENCES "public"."progress"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;