import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products } from '../db/schema.js';

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
  updatedAt: z.number().int(),
});

export async function productRoutes(fastify: FastifyInstance) {
  // GET /products?shopId=xxx — alle Produkte eines Shops
  fastify.get('/products', async (request, reply) => {
    const { shopId } = request.query as { shopId: string };
    if (!shopId) return reply.status(400).send({ error: 'shopId required' });
    const rows = db.select().from(products).where(eq(products.shopId, shopId)).all();
    return reply.send(rows);
  });

  // POST /products — Produkt anlegen (LWW-Upsert)
  fastify.post('/products', async (request, reply) => {
    const result = ProductSchema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() });
    const p = result.data;
    db.insert(products).values({
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
        updatedAt: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.updated_at ELSE ${products.updatedAt} END`,
      },
    }).run();
    return reply.status(201).send({ ok: true });
  });

  // PATCH /products/:id/deactivate — Soft-Delete
  fastify.patch('/products/:id/deactivate', async (request, reply) => {
    const { id } = request.params as { id: string };
    db.update(products).set({ active: false, updatedAt: Date.now() }).where(eq(products.id, id)).run();
    return reply.send({ ok: true });
  });

  // PATCH /products/:id/activate — Reaktivieren
  fastify.patch('/products/:id/activate', async (request, reply) => {
    const { id } = request.params as { id: string };
    db.update(products).set({ active: true, updatedAt: Date.now() }).where(eq(products.id, id)).run();
    return reply.send({ ok: true });
  });
}
