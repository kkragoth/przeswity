-- #44: assignment composite PK is (book_id, user_id, role); a sole book_id lookup
-- ("who is assigned to this book?") doesn't benefit from the prefix scan because the
-- frontend column order in the PK is fine for prefix queries. We add a dedicated index
-- to keep "all assignments for one book" cheap as the table grows.
CREATE INDEX IF NOT EXISTS "assignment_book_id_idx" ON "assignment" (book_id);
--> statement-breakpoint
-- #45: comment list filters by author still hot-paths through `comment_message`, but the
-- thread-scoped author filter benefits from this composite when authoring is rare.
CREATE INDEX IF NOT EXISTS "comment_thread_book_author_idx" ON "comment_thread" (book_id, created_by_id);
--> statement-breakpoint
-- #42: track Yjs payload size to flag pathological growth without a full COUNT(*) scan.
-- Backfill once; after the column exists, persistence.store() updates it on every write.
ALTER TABLE "book_yjs_state" ADD COLUMN IF NOT EXISTS "size_bytes" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE "book_yjs_state" SET "size_bytes" = octet_length("state") WHERE "size_bytes" = 0;
