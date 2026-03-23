CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`shop_id` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `products` ADD `min_stock` integer DEFAULT 0 NOT NULL;