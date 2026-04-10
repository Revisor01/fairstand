import type { FastifyInstance } from 'fastify';
import { eq, sql, and, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { categories, products } from '../db/schema.js';
import { broadcast } from './websocket.js';

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

    broadcast({ type: 'categories_changed', shopId: session.shopId });
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

    // Bulk-Update: alle Produkte mit altem Kategorienamen im Array aktualisieren
    await db.execute(sql`
      UPDATE products
      SET categories = array_replace(categories, ${oldName}, ${newName})
      WHERE shop_id = ${cat.shopId}
        AND ${oldName} = ANY(categories)
    `);

    // Kategorie selbst umbenennen
    await db
      .update(categories)
      .set({ name: newName })
      .where(eq(categories.id, id));

    broadcast({ type: 'categories_changed', shopId: session.shopId });
    broadcast({ type: 'products_changed', shopId: session.shopId });
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

    // Prüfen wie viele Produkte diese Kategorie im Array haben
    const countResult = await db.execute(sql`
      SELECT count(*)::integer as count
      FROM products
      WHERE shop_id = ${cat.shopId}
        AND ${cat.name} = ANY(categories)
    `);
    const count = Number((countResult.rows[0] as Record<string, unknown>)?.count ?? 0);
    if (count > 0) {
      return reply.status(409).send({
        error: `Kategorie wird von ${count} Produkt${count !== 1 ? 'en' : ''} verwendet. Bitte zuerst Produkte umkategorisieren.`,
      });
    }

    await db.delete(categories).where(eq(categories.id, id));

    broadcast({ type: 'categories_changed', shopId: session.shopId });
    return { ok: true };
  });
}
