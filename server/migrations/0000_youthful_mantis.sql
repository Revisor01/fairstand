CREATE TABLE `outbox_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shop_id` text NOT NULL,
	`operation` text NOT NULL,
	`payload` text NOT NULL,
	`processed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`article_number` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`purchase_price` integer NOT NULL,
	`sale_price` integer NOT NULL,
	`vat_rate` integer NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`min_stock` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`image_url` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`items` text NOT NULL,
	`total_cents` integer NOT NULL,
	`paid_cents` integer NOT NULL,
	`change_cents` integer NOT NULL,
	`donation_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	`synced_at` integer,
	`cancelled_at` integer
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`shop_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`name` text NOT NULL,
	`pin` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shops_shop_id_unique` ON `shops` (`shop_id`);