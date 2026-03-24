CREATE TABLE IF NOT EXISTS `categories` (
  `id` text PRIMARY KEY NOT NULL,
  `shop_id` text NOT NULL,
  `name` text NOT NULL,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL
);
