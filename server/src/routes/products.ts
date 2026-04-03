import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, sql, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products, priceHistories, sales, stockMovements } from '../db/schema.js';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { broadcast } from './websocket.js';

const IMAGES_DIR = process.env.IMAGES_DIR ?? '/app/data/images';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const ProductSchema = z.object({
  id: z.string(),
  shopId: z.string(),
  articleNumber: z.string(),
  name: z.string(),
  category: z.string().default(''),
  purchasePrice: z.number().int(),
  salePrice: z.number().int(),
  vatRate: z.number().int(),
  stock: z.number().int().default(0),
  minStock: z.number().int().default(0),
  active: z.boolean().default(true),
  imageUrl: z.string().nullable().optional(),
  updatedAt: z.number().int(),
});

export async function productRoutes(fastify: FastifyInstance) {
  // Bilder-Verzeichnis sicherstellen
  await mkdir(IMAGES_DIR, { recursive: true });

  // GET /products — alle Produkte des authentifizierten Shops (inkl. last_sale_at)
  fastify.get('/products', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const rows = await db.execute(sql`
      SELECT
        p.id,
        p.shop_id,
        p.article_number,
        p.name,
        p.category,
        p.purchase_price,
        p.sale_price,
        p.vat_rate,
        p.stock,
        p.min_stock,
        p.active,
        p.image_url,
        p.updated_at,
        MAX(CASE WHEN s.cancelled_at IS NULL THEN s.created_at ELSE NULL END) AS last_sale_at
      FROM products p
      LEFT JOIN LATERAL (
        SELECT s2.created_at, s2.cancelled_at
        FROM sales s2
        WHERE s2.shop_id = p.shop_id
          AND s2.items::jsonb @> json_build_array(json_build_object('productId', p.id))::jsonb
      ) s ON true
      WHERE p.shop_id = ${shopId}
      GROUP BY p.id
    `);
    return reply.send(rows.rows);
  });

  // POST /products — Produkt anlegen (LWW-Upsert)
  fastify.post('/products', async (request, reply) => {
    const result = ProductSchema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() });
    const p = result.data;
    // ShopId-Validierung: Produkt muss zum Shop der Session gehören
    const session = (request as any).session as { shopId: string };
    if (p.shopId !== session.shopId) {
      return reply.status(403).send({ error: 'Zugriff verweigert: falsche shopId' });
    }
    try {
      await db.transaction(async (tx) => {
        // Bestehenden Preis lesen für Logging (vor dem Upsert)
        const [existing] = await tx.select({
          purchasePrice: products.purchasePrice,
          salePrice: products.salePrice,
        }).from(products).where(eq(products.id, p.id)).limit(1);

        // Preis-History Logging — nur wenn Produkt existiert UND Preis sich ändert
        if (existing) {
          if (existing.purchasePrice !== p.purchasePrice) {
            await tx.insert(priceHistories).values({
              shopId: p.shopId,
              productId: p.id,
              field: 'purchase_price',
              oldValue: existing.purchasePrice,
              newValue: p.purchasePrice,
              changedAt: Date.now(),
            });
          }
          if (existing.salePrice !== p.salePrice) {
            await tx.insert(priceHistories).values({
              shopId: p.shopId,
              productId: p.id,
              field: 'sale_price',
              oldValue: existing.salePrice,
              newValue: p.salePrice,
              changedAt: Date.now(),
            });
          }
        }

        // LWW-Upsert — unverändert
        await tx.insert(products).values({
          id: p.id,
          shopId: p.shopId,
          articleNumber: p.articleNumber,
          name: p.name,
          category: p.category,
          purchasePrice: p.purchasePrice,
          salePrice: p.salePrice,
          vatRate: p.vatRate,
          stock: p.stock,
          minStock: p.minStock,
          active: p.active,
          imageUrl: p.imageUrl ?? null,
          updatedAt: p.updatedAt,
        }).onConflictDoUpdate({
          target: products.id,
          set: {
            articleNumber: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.article_number ELSE ${products.articleNumber} END`,
            name: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.name ELSE ${products.name} END`,
            category: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.category ELSE ${products.category} END`,
            purchasePrice: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.purchase_price ELSE ${products.purchasePrice} END`,
            salePrice: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.sale_price ELSE ${products.salePrice} END`,
            vatRate: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.vat_rate ELSE ${products.vatRate} END`,
            stock: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.stock ELSE ${products.stock} END`,
            minStock: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.min_stock ELSE ${products.minStock} END`,
            active: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.active ELSE ${products.active} END`,
            imageUrl: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.image_url ELSE ${products.imageUrl} END`,
            updatedAt: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.updated_at ELSE ${products.updatedAt} END`,
          },
        });
      });
    } catch (err: unknown) {
      // PostgreSQL unique-Verletzung: code 23505
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
        return reply.status(409).send({ error: 'Artikelnummer bereits vorhanden — bitte eine andere Artikelnummer wählen.' });
      }
      throw err;
    }
    reply.status(201).send({ ok: true });
    broadcast({ type: 'products_changed', shopId: session.shopId });
  });

  // PATCH /products/:id/deactivate — Soft-Delete
  fastify.patch('/products/:id/deactivate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = (request as any).session as { shopId: string };

    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!product) return reply.status(404).send({ error: 'Produkt nicht gefunden' });
    if (product.shopId !== session.shopId) {
      return reply.status(403).send({ error: 'Zugriff verweigert' });
    }

    await db.update(products).set({ active: false, updatedAt: Date.now() }).where(eq(products.id, id));
    reply.send({ ok: true });
    broadcast({ type: 'products_changed', shopId: session.shopId });
  });

  // PATCH /products/:id/activate — Reaktivieren
  fastify.patch('/products/:id/activate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = (request as any).session as { shopId: string };

    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!product) return reply.status(404).send({ error: 'Produkt nicht gefunden' });
    if (product.shopId !== session.shopId) {
      return reply.status(403).send({ error: 'Zugriff verweigert' });
    }

    await db.update(products).set({ active: true, updatedAt: Date.now() }).where(eq(products.id, id));
    reply.send({ ok: true });
    broadcast({ type: 'products_changed', shopId: session.shopId });
  });

  // POST /products/:id/image — Produktbild hochladen
  fastify.post('/products/:id/image', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = (request as any).session as { shopId: string };

    // Ownership-Check vor Dateiverarbeitung
    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!product) return reply.status(404).send({ error: 'Produkt nicht gefunden' });
    if (product.shopId !== session.shopId) {
      return reply.status(403).send({ error: 'Zugriff verweigert' });
    }

    let file: Awaited<ReturnType<typeof request.file>> | null = null;
    try {
      file = await request.file({ limits: { fileSize: 5 * 1024 * 1024 } });
    } catch {
      return reply.status(400).send({ error: 'Kein Bild empfangen' });
    }

    if (!file) {
      return reply.status(400).send({ error: 'Kein Bild empfangen' });
    }

    const mimeType = file.mimetype;
    const ext = MIME_TO_EXT[mimeType];
    if (!ext) {
      return reply.status(415).send({ error: 'Nur JPEG, PNG und WebP erlaubt' });
    }

    const filename = `${id}.${ext}`;
    const filepath = `${IMAGES_DIR}/${filename}`;
    const buffer = await file.toBuffer();
    await writeFile(filepath, buffer);

    const imageUrl = `/api/images/${filename}`;
    await db.update(products).set({ imageUrl }).where(eq(products.id, id));

    return reply.send({ ok: true, imageUrl });
  });

  // DELETE /products/:id — Hartes Löschen (nur ohne Verkaufshistorie möglich)
  fastify.delete('/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = (request as any).session as { shopId: string };

    // Ownership-Check
    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!product) return reply.status(404).send({ error: 'Produkt nicht gefunden' });
    if (product.shopId !== session.shopId) {
      return reply.status(403).send({ error: 'Zugriff verweigert' });
    }

    // Verkaufshistorie-Check: Artikel darf keine Verkäufe haben (items ist jsonb Array)
    // Prüfung: sales mit shopId des Shops, die diesen Artikel in items enthalten
    const salesWithProduct = await db
      .select({ id: sales.id })
      .from(sales)
      .where(
        and(
          eq(sales.shopId, session.shopId),
          sql`${sales.items}::jsonb @> ${JSON.stringify([{ productId: id }])}::jsonb`
        )
      )
      .limit(1);

    if (salesWithProduct.length > 0) {
      return reply.status(409).send({
        error: 'Artikel kann nicht gelöscht werden — es existieren Verkäufe mit diesem Artikel. Bitte deaktivieren statt löschen.'
      });
    }

    // Hard-Delete aus DB + zugehörige price_histories und stock_movements löschen
    await db.transaction(async (tx) => {
      await tx.delete(priceHistories).where(eq(priceHistories.productId, id));
      await tx.delete(stockMovements).where(eq(stockMovements.productId, id));
      await tx.delete(products).where(eq(products.id, id));
    });

    reply.send({ ok: true });
    broadcast({ type: 'products_changed', shopId: session.shopId });
  });

  // GET /api/images/:filename — Produktbild ausliefern
  fastify.get('/images/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };

    // Sicherheitscheck: keine Path-Traversal
    if (filename.includes('/') || filename.includes('..')) {
      return reply.status(400).send({ error: 'Ungültiger Dateiname' });
    }

    const ext = extname(filename).slice(1).toLowerCase();
    const mimeType = EXT_TO_MIME[ext];
    if (!mimeType) {
      return reply.status(415).send({ error: 'Unbekannter Dateityp' });
    }

    const filepath = `${IMAGES_DIR}/${filename}`;
    let data: Buffer;
    try {
      data = await readFile(filepath);
    } catch {
      return reply.status(404).send({ error: 'Bild nicht gefunden' });
    }

    reply.header('Content-Type', mimeType);
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    return reply.send(data);
  });
}
