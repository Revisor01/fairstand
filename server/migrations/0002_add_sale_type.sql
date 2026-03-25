ALTER TABLE "sales" ADD COLUMN "type" text;
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "withdrawal_reason" text;
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "returned_items" jsonb;
