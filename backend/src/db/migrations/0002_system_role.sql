ALTER TABLE "user" ADD COLUMN "system_role" text;
--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "is_admin";
--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "is_coordinator";
