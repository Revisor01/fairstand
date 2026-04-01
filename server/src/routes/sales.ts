import type { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sales, products, stockMovements } from '../db/schema.js';
import { broadcast } from './websocket.js';

export async function salesRoutes(fastify: FastifyInstance) {
  // GET /sales?shopId=...&from=...&to=...
  fastify.get('/sales', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { from, to } = request.query as { from?: string; to?: string };

    if (!from || !to) {
      return reply.status(400).send({ error: 'from and to (Unix-ms) required' });
    }

    const fromTs = Number(from);
    const toTs = Number(to);

    if (isNaN(fromTs) || isNaN(toTs)) {
      return reply.status(400).send({ error: 'from and to must be numbers' });
    }

    const result = await db.execute(sql`
      SELECT
        id,
        shop_id,
        items,
        total_cents,
        paid_cents,
        change_cents,
        donation_cents,
        type,
        withdrawal_reason,
        created_at,
        synced_at,
        cancelled_at,
        returned_items
      FROM sales
      WHERE shop_id = ${shopId}
        AND created_at >= ${fromTs}
        AND created_at <= ${toTs}
      ORDER BY created_at DESC
    `);

    return reply.send(result.rows);
  });

  // DELETE /sales/:id — permanently remove a sale and restock products
  fastify.delete<{ Params: { id: string } }>('/sales/:id', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { id } = request.params;

    // Look up the sale
    const [sale] = await db.select().from(sales).where(eq(sales.id, id)).limit(1);

    if (!sale || sale.shopId !== shopId) {
      return reply.status(404).send({ error: 'Verkauf nicht gefunden' });
    }

    const saleItems = (sale.items ?? []) as Array<{ productId: string; quantity: number }>;
    let stockAdjusted = false;

    await db.transaction(async (tx) => {
      // If sale is not cancelled, restock products
      if (!sale.cancelledAt) {
        for (const item of saleItems) {
          const [prod] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
          if (!prod || prod.shopId !== shopId) continue;
          await tx.update(products)
            .set({ stock: sql`${products.stock} + ${Number(item.quantity)}` })
            .where(eq(products.id, item.productId));
          // Stock-Movement für Hard-Delete-Restock protokollieren
          await tx.insert(stockMovements).values({
            shopId,
            productId: item.productId,
            type: 'hard_delete',
            quantity: Number(item.quantity), // positiv = Eingang (Restock)
            referenceSaleId: id,
            reason: 'Hard-Delete: Verkauf vollständig gelöscht',
            movedAt: Date.now(),
          });
        }
        stockAdjusted = true;
      }

      // Delete the sale
      await tx.delete(sales).where(eq(sales.id, id));
    });

    if (stockAdjusted) {
      broadcast({ type: 'products_changed', shopId });
    }

    return reply.send({ ok: true });
  });
}
