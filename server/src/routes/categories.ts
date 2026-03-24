import type { FastifyInstance } from 'fastify';
import { eq, sql, and, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { categories, products } from '../db/schema.js';

export async function categoryRoutes(fastify: FastifyInstance) {
  // GET /categories — alle Kategorien des authentifizierten Shops
  fastify.get('/categories', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;

    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.shopId, shopId))
      .orderBy(asc(categories.sortOrder), asc(categories.name));

    return rows.map(row => ({
      id: row.id,
      shopId: row.shopId,
      name: row.name,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
    }));
  });

  // POST /categories — neue Kategorie anlegen
  fastify.post('/categories', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const body = request.body as { name?: string };
    const { name } = body ?? {};

    if (!name || !name.trim()) {
      return reply.status(400).send({ error: 'name erforderlich' });
    }

    const id = crypto.randomUUID();
    await db.insert(categories).values({
      id,
      shopId: session.shopId,
      name: name.trim(),
      sortOrder: 0,
      createdAt: Date.now(),
    });

    return { ok: true, id };
  });

  // PATCH /categories/:id — Kategorie umbenennen (Bulk-Update in Produkten)
  fastify.patch('/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = (request as any).session as { shopId: string };
    const body = request.body as { name?: string };
    const { name } = body ?? {};

    if (!name || !name.trim()) {
      return reply.status(400).send({ error: 'name erforderlich' });
    }

    const [cat] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!cat) {
      return reply.status(404).send({ error: 'Kategorie nicht gefunden' });
    }

    // ShopId-Validierung: Kategorie muss zum Shop der Session gehören
    if (cat.shopId !== session.shopId) {
      return reply.status(403).send({ error: 'Zugriff verweigert: falsche shopId' });
    }

    const oldName = cat.name;
    const newName = name.trim();

    // Bulk-Update: alle Produkte mit altem Kategorienamen aktualisieren
    await db
      .update(products)
      .set({ category: newName })
      .where(and(eq(products.shopId, cat.shopId), eq(products.category, oldName)));

    // Kategorie selbst umbenennen
    await db
      .update(categories)
      .set({ name: newName })
      .where(eq(categories.id, id));

    return { ok: true };
  });

  // DELETE /categories/:id — Kategorie löschen (nur wenn keine Produkte)
  fastify.delete('/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = (request as any).session as { shopId: string };

    const [cat] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!cat) {
      return reply.status(404).send({ error: 'Kategorie nicht gefunden' });
    }

    // ShopId-Validierung: Kategorie muss zum Shop der Session gehören
    if (cat.shopId !== session.shopId) {
      return reply.status(403).send({ error: 'Zugriff verweigert: falsche shopId' });
    }

    // Prüfen wie viele Produkte diese Kategorie verwenden
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(eq(products.shopId, cat.shopId), eq(products.category, cat.name)));

    const count = Number(countResult?.count ?? 0);
    if (count > 0) {
      return reply.status(409).send({
        error: `Kategorie wird von ${count} Produkt${count !== 1 ? 'en' : ''} verwendet. Bitte zuerst Produkte umkategorisieren.`,
      });
    }

    await db.delete(categories).where(eq(categories.id, id));

    return { ok: true };
  });
}
