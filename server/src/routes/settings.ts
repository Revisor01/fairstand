import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';

const SettingSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export async function settingsRoutes(fastify: FastifyInstance) {
  // GET /settings — alle Settings des authentifizierten Shops
  fastify.get('/settings', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const rows = db.select().from(settings).where(eq(settings.shopId, shopId)).all();
    return reply.send(rows);
  });

  // PUT /settings — Upsert
  fastify.put('/settings', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const result = SettingSchema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() });
    const s = result.data;
    db.insert(settings).values({ key: s.key, value: s.value, shopId: session.shopId }).onConflictDoUpdate({
      target: settings.key,
      set: { value: s.value },
    }).run();
    return reply.send({ ok: true });
  });
}
