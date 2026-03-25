import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { shops } from '../db/schema.js';
import { hashPin } from '../lib/crypto.js';

// Master-Guard: Prüft ob der anfragende Shop is_master = true hat
async function requireMaster(request: any, reply: any): Promise<boolean> {
  const session = (request as any).session as { shopId: string };
  const [shop] = await db.select().from(shops).where(eq(shops.shopId, session.shopId));
  if (!shop?.isMaster) {
    reply.status(403).send({ error: 'Nur für Master-Shops verfügbar' });
    return false;
  }
  return true;
}

const CreateShopSchema = z.object({
  name: z.string().min(2).max(60),
  shopId: z.string().min(3).max(40).regex(/^[a-z0-9-]+$/),
  pin: z.string().min(4).max(8),
});

const UpdateShopSchema = z.object({
  active: z.boolean(),
});

export async function shopsRoutes(fastify: FastifyInstance) {
  // GET /shops — Liste aller Shops (ohne PIN-Hash)
  fastify.get('/shops', async (request, reply) => {
    if (!await requireMaster(request, reply)) return;
    const rows = await db.select({
      id: shops.id,
      shopId: shops.shopId,
      name: shops.name,
      isMaster: shops.isMaster,
      active: shops.active,
      createdAt: shops.createdAt,
    }).from(shops).orderBy(shops.createdAt);
    return reply.send(rows);
  });

  // POST /shops — Neuen Shop anlegen
  fastify.post('/shops', async (request, reply) => {
    if (!await requireMaster(request, reply)) return;
    const result = CreateShopSchema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() });
    const { name, shopId, pin } = result.data;

    // shopId darf nicht bereits existieren
    const [existing] = await db.select().from(shops).where(eq(shops.shopId, shopId));
    if (existing) return reply.status(409).send({ error: 'Shop-ID bereits vergeben' });

    const pinHash = await hashPin(pin);
    await db.insert(shops).values({
      id: crypto.randomUUID(),
      shopId,
      name,
      pin: pinHash,
      isMaster: false,
      active: true,
      createdAt: Date.now(),
    });
    return reply.status(201).send({ shopId, name, active: true });
  });

  // PATCH /shops/:shopId — Shop aktivieren/deaktivieren
  fastify.patch('/shops/:shopId', async (request, reply) => {
    if (!await requireMaster(request, reply)) return;
    const { shopId } = request.params as { shopId: string };
    const result = UpdateShopSchema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() });

    // Master-Shop darf nicht deaktiviert werden
    const [target] = await db.select().from(shops).where(eq(shops.shopId, shopId));
    if (!target) return reply.status(404).send({ error: 'Shop nicht gefunden' });
    if (target.isMaster && !result.data.active) {
      return reply.status(400).send({ error: 'Master-Shop kann nicht deaktiviert werden' });
    }

    await db.update(shops).set({ active: result.data.active }).where(eq(shops.shopId, shopId));
    return reply.send({ ok: true });
  });
}
