import { pgTable, text, integer, boolean, serial, jsonb } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
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
  active: boolean('active').notNull().default(true),
  imageUrl: text('image_url'),
  updatedAt: integer('updated_at').notNull(),
});

export const sales = pgTable('sales', {
  id: text('id').primaryKey(),
  shopId: text('shop_id').notNull(),
  items: jsonb('items').notNull(),
  totalCents: integer('total_cents').notNull(),
  paidCents: integer('paid_cents').notNull(),
  changeCents: integer('change_cents').notNull(),
  donationCents: integer('donation_cents').notNull(),
  type: text('type'),
  createdAt: integer('created_at').notNull(),
  syncedAt: integer('synced_at'),
  cancelledAt: integer('cancelled_at'),
});

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  shopId: text('shop_id').notNull(),
});

export const outboxEvents = pgTable('outbox_events', {
  id: serial('id').primaryKey(),
  shopId: text('shop_id').notNull(),
  operation: text('operation').notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: integer('processed_at'),
  createdAt: integer('created_at').notNull(),
});

export const shops = pgTable('shops', {
  id: text('id').primaryKey(),
  shopId: text('shop_id').notNull().unique(),
  name: text('name').notNull(),
  pin: text('pin').notNull(),
  createdAt: integer('created_at').notNull(),
  isMaster: boolean('is_master').notNull().default(false),
  active: boolean('active').notNull().default(true),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  shopId: text('shop_id').notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});
