ALTER TYPE "public"."analysis_kind" ADD VALUE 'question_summary';--> statement-breakpoint
ALTER TABLE "analysis_results" ADD COLUMN "question_id" uuid;--> statement-breakpoint
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;