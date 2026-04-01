import type { FastifyInstance } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products, priceHistories, stockMovements } from '../db/schema.js';

export async function priceHistoryRoutes(fastify: FastifyInstance) {
  // GET /products/:id/price-history — Alle Preis-Änderungen für einen Artikel
  fastify.get('/products/:id/price-history', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = (request as any).session as { shopId: string };

    // Ownership-Check: Produkt muss zum Shop der Session gehören
    const [product] = await db.select({ id: products.id, shopId: products.shopId })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product || product.shopId !== session.shopId) {
      return reply.status(403).send({ error: 'Zugriff verweigert' });
    }

    const history = await db
      .select()
      .from(priceHistories)
      .where(eq(priceHistories.productId, id))
      .orderBy(desc(priceHistories.changedAt));

    return reply.send(history);
  });

  // GET /products/:id/stock-movements — Alle Bestandsbewegungen für einen Artikel
  fastify.get('/products/:id/stock-movements', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = (request as any).session as { shopId: string };

    // Ownership-Check: Produkt muss zum Shop der Session gehören
    const [product] = await db.select({ id: products.id, shopId: products.shopId })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product || product.shopId !== session.shopId) {
      return reply.status(403).send({ error: 'Zugriff verweigert' });
    }

    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, id))
      .orderBy(desc(stockMovements.movedAt));

    return reply.send(movements);
  });
}
