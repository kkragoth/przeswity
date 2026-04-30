-- CHECK constraints on book stage/progress/progress_mode. Run scripts/audit-stage-progress.ts
-- before deploying — bad rows make this migration fail mid-flight.
ALTER TABLE "book" ADD CONSTRAINT "book_stage_check"
    CHECK (stage IN ('translation','editing','authorization','proofreading','applying_changes','typesetting','post_typeset_proof','finalization'));
--> statement-breakpoint
ALTER TABLE "book" ADD CONSTRAINT "book_progress_mode_check"
    CHECK (progress_mode IN ('auto','manual'));
--> statement-breakpoint
ALTER TABLE "book" ADD CONSTRAINT "book_progress_range_check"
    CHECK (progress BETWEEN 0 AND 100);
--> statement-breakpoint
-- Hot lookups: assignment(user_id) for listVisibleBooks/buildMeResponse,
-- book(created_by_id) for owned-books queries, comment_thread partial for active filter.
CREATE INDEX IF NOT EXISTS "assignment_user_id_idx" ON "assignment" (user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "book_created_by_id_idx" ON "book" (created_by_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comment_thread_book_active_idx" ON "comment_thread" (book_id)
    WHERE NOT resolved AND detached_at IS NULL;
