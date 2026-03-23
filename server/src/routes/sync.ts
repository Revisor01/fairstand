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
  createdAt: z.number().int(),
  syncedAt: z.number().int().optional(),
});

const OutboxEntrySchema = z.object({
  operation: z.enum(['SALE_COMPLETE', 'STOCK_ADJUST']),
  payload: z.unknown(),
  shopId: z.string(),
  createdAt: z.number().int(),
});

const SyncBatchSchema = z.object({
  entries: z.array(OutboxEntrySchema),
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
              createdAt: sale.createdAt,
              syncedAt: Date.now(),
            }).onConflictDoNothing().run();

            // 2. Produkte aus Items upserten — Produkt kann auf dem Server noch unbekannt sein
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
              }).onConflictDoNothing().run();

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
        // STOCK_ADJUST: Phase 3 — noch nicht implementiert
      } catch (err) {
        errors.push({ index: i, message: String(err) });
      }
    }

    return reply.send({ processed, errors });
  });
}
