import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  shopId: text('shop_id').notNull(),
  articleNumber: text('article_number').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull().default(''),
  purchasePrice: integer('purchase_price').notNull(),
  salePrice: integer('sale_price').notNull(),
  vatRate: integer('vat_rate').notNull(),
  stock: integer('stock').notNull().default(0),
  minStock: integer('min_stock').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  updatedAt: integer('updated_at').notNull(),
});

export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  shopId: text('shop_id').notNull(),
  items: text('items', { mode: 'json' }).notNull(),
  totalCents: integer('total_cents').notNull(),
  paidCents: integer('paid_cents').notNull(),
  changeCents: integer('change_cents').notNull(),
  donationCents: integer('donation_cents').notNull(),
  createdAt: integer('created_at').notNull(),
  syncedAt: integer('synced_at'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  shopId: text('shop_id').notNull(),
});

export const outboxEvents = sqliteTable('outbox_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shopId: text('shop_id').notNull(),
  operation: text('operation').notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
  processedAt: integer('processed_at'),
  createdAt: integer('created_at').notNull(),
});

export const shops = sqliteTable('shops', {
  id: text('id').primaryKey(),           // UUID
  shopId: text('shop_id').notNull().unique(), // slug: 'st-secundus-hennstedt'
  name: text('name').notNull(),          // 'St. Secundus Hennstedt'
  pin: text('pin').notNull(),            // SHA-256 Hash des PINs (6 Stellen)
  createdAt: integer('created_at').notNull(),
});
