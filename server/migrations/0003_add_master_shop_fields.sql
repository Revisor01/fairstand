ALTER TABLE "shops" ADD COLUMN "is_master" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "active" boolean DEFAULT true NOT NULL;
