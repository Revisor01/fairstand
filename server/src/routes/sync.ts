import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sales, products, outboxEvents } from '../db/schema.js';
import { broadcast } from './websocket.js';

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
  withdrawalReason: z.string().optional(),
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

    // ShopId-Validierung: alle Entries müssen zum Shop der Session gehören
    const session = (request as any).session as { shopId: string };
    for (const entry of result.data.entries) {
      if (entry.shopId !== session.shopId) {
        return reply.status(403).send({ error: 'Zugriff verweigert: shopId stimmt nicht überein' });
      }
    }

    let processed = 0;
    const errors: Array<{ index: number; message: string }> = [];
    let hasStockChanged = false;

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

          await db.transaction(async (tx) => {
            // 1. Sale idempotent einfuegen (INSERT OR IGNORE via onConflictDoNothing)
            await tx.insert(sales).values({
              id: sale.id,
              shopId: sale.shopId,
              items: sale.items,
              totalCents: sale.totalCents,
              paidCents: sale.paidCents,
              changeCents: sale.changeCents,
              donationCents: sale.donationCents,
              type: sale.type ?? null,
              withdrawalReason: sale.withdrawalReason ?? null,
              createdAt: sale.createdAt,
              syncedAt: Date.now(),
            }).onConflictDoNothing();

            // 2. Stock-Delta für jedes Produkt — kein Produkt-Upsert aus Sale-Items
            // Sale-Items enthalten nur Snapshots (Name, Preis), keine vollständigen
            // Produktdaten (category, purchasePrice etc.). Ein Upsert würde diese
            // Felder mit Defaults überschreiben. Produkte werden über POST /api/products
            // angelegt/aktualisiert, nicht über Sales.
            for (const item of sale.items) {
              const [prod] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
              if (!prod || prod.shopId !== entry.shopId) {
                // Produkt gehört nicht zu diesem Shop — Stock-Delta überspringen (kein Cross-Shop-Update)
                continue;
              }
              await tx.update(products)
                .set({ stock: sql`${products.stock} - ${item.quantity}` })
                .where(eq(products.id, item.productId));
            }

            // 3. OutboxEvent auf dem Server protokollieren
            await tx.insert(outboxEvents).values({
              shopId: entry.shopId,
              operation: entry.operation,
              payload: entry.payload,
              processedAt: Date.now(),
              createdAt: entry.createdAt,
            });
          });

          hasStockChanged = true;
          processed++;
        }
        if (entry.operation === 'STOCK_ADJUST') {
          const adjustResult = StockAdjustSchema.safeParse(entry.payload);
          if (!adjustResult.success) {
            errors.push({ index: i, message: 'Ungueltiger STOCK_ADJUST-Payload: ' + JSON.stringify(adjustResult.error.flatten()) });
            continue;
          }
          const adj = adjustResult.data;
          await db.transaction(async (tx) => {
            // Ownership-Check: Produkt muss zu diesem Shop gehören
            const [adjustProd] = await tx.select().from(products).where(eq(products.id, adj.productId)).limit(1);
            if (!adjustProd || adjustProd.shopId !== entry.shopId) {
              errors.push({ index: i, message: 'Produkt gehört nicht zu diesem Shop' });
              return;
            }
            await tx.update(products)
              .set({ stock: sql`${products.stock} + ${adj.delta}`, updatedAt: sql`${Date.now()}` })
              .where(eq(products.id, adj.productId));
            await tx.insert(outboxEvents).values({
              shopId: entry.shopId,
              operation: entry.operation,
              payload: entry.payload,
              processedAt: Date.now(),
              createdAt: entry.createdAt,
            });
          });
          hasStockChanged = true;
          processed++;
        }
        if (entry.operation === 'SALE_CANCEL') {
          const cancelResult = SaleCancelSchema.safeParse(entry.payload);
          if (!cancelResult.success) {
            errors.push({ index: i, message: 'Ungültiger SALE_CANCEL-Payload: ' + JSON.stringify(cancelResult.error.flatten()) });
            continue;
          }
          const cancel = cancelResult.data;
          await db.transaction(async (tx) => {
            // Sale als storniert markieren (idempotent via cancelledAt)
            await tx.update(sales)
              .set({ cancelledAt: cancel.cancelledAt })
              .where(eq(sales.id, cancel.saleId));

            // Bestand für alle Artikel zurückbuchen (Delta +quantity)
            for (const item of cancel.items) {
              const [cancelProd] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
              if (!cancelProd || cancelProd.shopId !== entry.shopId) {
                continue;  // Produkt gehört nicht zu diesem Shop — überspringen
              }
              await tx.update(products)
                .set({ stock: sql`${products.stock} + ${item.quantity}` })
                .where(eq(products.id, item.productId));
            }

            // OutboxEvent protokollieren
            await tx.insert(outboxEvents).values({
              shopId: entry.shopId,
              operation: entry.operation,
              payload: entry.payload,
              processedAt: Date.now(),
              createdAt: entry.createdAt,
            });
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
          await db.transaction(async (tx) => {
            // Ownership-Check: Produkt muss zu diesem Shop gehören
            const [returnProd] = await tx.select().from(products).where(eq(products.id, ret.productId)).limit(1);
            if (!returnProd || returnProd.shopId !== entry.shopId) {
              errors.push({ index: i, message: 'Produkt gehört nicht zu diesem Shop' });
              return;
            }
            // Bestand für zurückgegebenen Artikel zurückbuchen
            await tx.update(products)
              .set({ stock: sql`${products.stock} + ${ret.quantity}` })
              .where(eq(products.id, ret.productId));

            // OutboxEvent protokollieren
            await tx.insert(outboxEvents).values({
              shopId: entry.shopId,
              operation: entry.operation,
              payload: entry.payload,
              processedAt: Date.now(),
              createdAt: entry.createdAt,
            });
          });
          processed++;
        }
      } catch (err) {
        errors.push({ index: i, message: String(err) });
      }
    }

    if (hasStockChanged) {
      broadcast({ type: 'stock_changed', shopId: session.shopId });
    }

    return reply.send({ processed, errors });
  });
}
