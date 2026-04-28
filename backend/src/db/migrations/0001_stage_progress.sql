ALTER TABLE "book" ADD COLUMN "stage" text DEFAULT 'editing' NOT NULL;
--> statement-breakpoint
ALTER TABLE "book" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "book" ADD COLUMN "progress_mode" text DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
ALTER TABLE "book" ADD COLUMN "stage_changed_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "book" ADD COLUMN "stage_due_at" timestamp;
--> statement-breakpoint
ALTER TABLE "book" ADD COLUMN "stage_note" text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE "book_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"from_stage" text,
	"to_stage" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "book_stage_history" ADD CONSTRAINT "book_stage_history_book_id_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."book"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "book_stage_history" ADD CONSTRAINT "book_stage_history_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "book_stage_history_book_idx" ON "book_stage_history" USING btree ("book_id","created_at");
