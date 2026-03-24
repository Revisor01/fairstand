import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sales, products, outboxEvents } from '../db/schema.js';

const SaleItemSchema = z.object({
  productId: z.string(),
  articleNumber: z.string(),
  name: z.string(),
  salePrice: z.number().int(),
  purchasePrice: z.number().int().optional(),
  quantity: z.number().int().positive(),
});

const SaleSchema = z.object({
  id: z.string(),
  shopId: z.string(),
  items: z.array(SaleItemSchema),
  totalCents: z.number().int(),
  paidCents: z.number().int(),
  changeCents: z.number().int(),
  donationCents: z.number().int(),
  type: z.enum(['sale', 'withdrawal']).optional(),
  createdAt: z.number().int(),
  syncedAt: z.number().int().optional(),
});

const OutboxEntrySchema = z.object({
  operation: z.enum(['SALE_COMPLETE', 'STOCK_ADJUST', 'SALE_CANCEL', 'ITEM_RETURN']),
  payload: z.unknown(),
  shopId: z.string(),
  createdAt: z.number().int(),
});

const SyncBatchSchema = z.object({
  entries: z.array(OutboxEntrySchema),
});

const StockAdjustSchema = z.object({
  productId: z.string(),
  delta: z.number().int(),
  reason: z.string().optional(),
  shopId: z.string(),
});

const SaleCancelSchema = z.object({
  saleId: z.string(),
  shopId: z.string(),
  items: z.array(SaleItemSchema),
  cancelledAt: z.number().int(),
});

const ItemReturnSchema = z.object({
  saleId: z.string(),
  shopId: z.string(),
  productId: z.string(),
  quantity: z.number().int().positive(),
  returnedAt: z.number().int(),
});

export async function syncRoutes(fastify: FastifyInstance) {
  fastify.post('/sync', async (request, reply) => {
    const result = SyncBatchSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() });
    }

    let processed = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < result.data.entries.length; i++) {
      const entry = result.data.entries[i];
      try {
        if (entry.operation === 'SALE_COMPLETE') {
          const saleResult = SaleSchema.safeParse(entry.payload);
          if (!saleResult.success) {
            errors.push({ index: i, message: 'Ungültiger Sale-Payload: ' + JSON.stringify(saleResult.error.flatten()) });
            continue;
          }
          const sale = saleResult.data;

          db.transaction((tx) => {
            // 1. Sale idempotent einfuegen (INSERT OR IGNORE via onConflictDoNothing)
            tx.insert(sales).values({
              id: sale.id,
              shopId: sale.shopId,
              items: sale.items,
              totalCents: sale.totalCents,
              paidCents: sale.paidCents,
              changeCents: sale.changeCents,
              donationCents: sale.donationCents,
              type: sale.type ?? null,
              createdAt: sale.createdAt,
              syncedAt: Date.now(),
            }).onConflictDoNothing().run();

            // 2. Produkte aus Items upserten — LWW (Last-Writer-Wins) bei Konflikt
            for (const item of sale.items) {
              tx.insert(products).values({
                id: item.productId,
                shopId: sale.shopId,
                articleNumber: item.articleNumber,
                name: item.name,
                category: '',
                purchasePrice: 0,
                salePrice: item.salePrice,
                vatRate: 7,
                stock: 0,
                active: true,
                updatedAt: sale.createdAt,
              }).onConflictDoUpdate({
                target: products.id,
                set: {
                  articleNumber: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.article_number ELSE ${products.articleNumber} END`,
                  name: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.name ELSE ${products.name} END`,
                  category: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.category ELSE ${products.category} END`,
                  purchasePrice: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.purchase_price ELSE ${products.purchasePrice} END`,
                  salePrice: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.sale_price ELSE ${products.salePrice} END`,
                  vatRate: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.vat_rate ELSE ${products.vatRate} END`,
                  stock: sql`${products.stock}`, // Stock bleibt — Delta kommt danach
                  active: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.active ELSE ${products.active} END`,
                  updatedAt: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.updated_at ELSE ${products.updatedAt} END`,
                },
              }).run();

              // Stock als Delta reduzieren — nie Absolutwert (OFF-04)
              tx.update(products)
                .set({ stock: sql`${products.stock} - ${item.quantity}` })
                .where(eq(products.id, item.productId))
                .run();
            }

            // 3. OutboxEvent auf dem Server protokollieren
            tx.insert(outboxEvents).values({
              shopId: entry.shopId,
              operation: entry.operation,
              payload: entry.payload,
              processedAt: Date.now(),
              createdAt: entry.createdAt,
            }).run();
          });

          processed++;
        }
        if (entry.operation === 'STOCK_ADJUST') {
          const adjustResult = StockAdjustSchema.safeParse(entry.payload);
          if (!adjustResult.success) {
            errors.push({ index: i, message: 'Ungueltiger STOCK_ADJUST-Payload: ' + JSON.stringify(adjustResult.error.flatten()) });
            continue;
          }
          const adj = adjustResult.data;
          db.transaction((tx) => {
            tx.update(products)
              .set({ stock: sql`${products.stock} + ${adj.delta}`, updatedAt: sql`${Date.now()}` })
              .where(eq(products.id, adj.productId))
              .run();
            tx.insert(outboxEvents).values({
              shopId: entry.shopId,
              operation: entry.operation,
              payload: entry.payload,
              processedAt: Date.now(),
              createdAt: entry.createdAt,
            }).run();
          });
          processed++;
        }
        if (entry.operation === 'SALE_CANCEL') {
          const cancelResult = SaleCancelSchema.safeParse(entry.payload);
          if (!cancelResult.success) {
            errors.push({ index: i, message: 'Ungültiger SALE_CANCEL-Payload: ' + JSON.stringify(cancelResult.error.flatten()) });
            continue;
          }
          const cancel = cancelResult.data;
          db.transaction((tx) => {
            // Sale als storniert markieren (idempotent via cancelledAt)
            tx.update(sales)
              .set({ cancelledAt: cancel.cancelledAt })
              .where(eq(sales.id, cancel.saleId))
              .run();

            // Bestand für alle Artikel zurückbuchen (Delta +quantity)
            for (const item of cancel.items) {
              tx.update(products)
                .set({ stock: sql`${products.stock} + ${item.quantity}` })
                .where(eq(products.id, item.productId))
                .run();
            }

            // OutboxEvent protokollieren
            tx.insert(outboxEvents).values({
              shopId: entry.shopId,
              operation: entry.operation,
              payload: entry.payload,
              processedAt: Date.now(),
              createdAt: entry.createdAt,
            }).run();
          });
          processed++;
        }
        if (entry.operation === 'ITEM_RETURN') {
          const returnResult = ItemReturnSchema.safeParse(entry.payload);
          if (!returnResult.success) {
            errors.push({ index: i, message: 'Ungültiger ITEM_RETURN-Payload: ' + JSON.stringify(returnResult.error.flatten()) });
            continue;
          }
          const ret = returnResult.data;
          db.transaction((tx) => {
            // Bestand für zurückgegebenen Artikel zurückbuchen
            tx.update(products)
              .set({ stock: sql`${products.stock} + ${ret.quantity}` })
              .where(eq(products.id, ret.productId))
              .run();

            // OutboxEvent protokollieren
            tx.insert(outboxEvents).values({
              shopId: entry.shopId,
              operation: entry.operation,
              payload: entry.payload,
              processedAt: Date.now(),
              createdAt: entry.createdAt,
            }).run();
          });
          processed++;
        }
      } catch (err) {
        errors.push({ index: i, message: String(err) });
      }
    }

    return reply.send({ processed, errors });
  });
}
