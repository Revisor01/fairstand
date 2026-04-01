CREATE TABLE "price_histories" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"product_id" text NOT NULL,
	"field" text NOT NULL,
	"old_value" integer NOT NULL,
	"new_value" integer NOT NULL,
	"changed_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"product_id" text NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"reference_sale_id" text,
	"reason" text,
	"moved_at" bigint NOT NULL
);
