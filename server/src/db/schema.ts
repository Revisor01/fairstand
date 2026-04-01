import { pgTable, text, integer, bigint, boolean, serial, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

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
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
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
  withdrawalReason: text('withdrawal_reason'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  syncedAt: bigint('synced_at', { mode: 'number' }),
  cancelledAt: bigint('cancelled_at', { mode: 'number' }),
  returnedItems: jsonb('returned_items'),
});

export const settings = pgTable('settings', {
  key: text('key').notNull(),
  value: text('value').notNull(),
  shopId: text('shop_id').notNull(),
}, (table) => ({
  pk: uniqueIndex('settings_key_shop_id_idx').on(table.key, table.shopId),
}));

export const outboxEvents = pgTable('outbox_events', {
  id: serial('id').primaryKey(),
  shopId: text('shop_id').notNull(),
  operation: text('operation').notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: bigint('processed_at', { mode: 'number' }),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const shops = pgTable('shops', {
  id: text('id').primaryKey(),
  shopId: text('shop_id').notNull().unique(),
  name: text('name').notNull(),
  pin: text('pin').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  isMaster: boolean('is_master').notNull().default(false),
  active: boolean('active').notNull().default(true),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  shopId: text('shop_id').notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const priceHistories = pgTable('price_histories', {
  id: serial('id').primaryKey(),
  shopId: text('shop_id').notNull(),
  productId: text('product_id').notNull(),
  field: text('field').notNull(), // 'purchase_price' | 'sale_price'
  oldValue: integer('old_value').notNull(),
  newValue: integer('new_value').notNull(),
  changedAt: bigint('changed_at', { mode: 'number' }).notNull(),
});

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  shopId: text('shop_id').notNull(),
  productId: text('product_id').notNull(),
  type: text('type').notNull(), // 'sale' | 'adjustment' | 'correction' | 'return' | 'hard_delete'
  quantity: integer('quantity').notNull(), // negativ = Ausgang, positiv = Eingang
  referenceSaleId: text('reference_sale_id'), // FK auf sales.id, nullable
  reason: text('reason'), // für STOCK_ADJUST, hard_delete etc., nullable
  movedAt: bigint('moved_at', { mode: 'number' }).notNull(),
});
