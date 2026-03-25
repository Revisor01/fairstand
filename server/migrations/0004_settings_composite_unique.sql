-- Remove old primary key constraint on settings.key
ALTER TABLE "settings" DROP CONSTRAINT "settings_pkey";
--> statement-breakpoint
-- Add composite unique index on (key, shop_id) so each shop can have its own settings
CREATE UNIQUE INDEX "settings_key_shop_id_idx" ON "settings" ("key", "shop_id");
