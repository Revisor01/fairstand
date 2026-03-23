import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';

const SettingSchema = z.object({
  key: z.string(),
  value: z.string(),
  shopId: z.string(),
});

export async function settingsRoutes(fastify: FastifyInstance) {
  // GET /settings?shopId=xxx
  fastify.get('/settings', async (request, reply) => {
    const { shopId } = request.query as { shopId: string };
    if (!shopId) return reply.status(400).send({ error: 'shopId required' });
    const rows = db.select().from(settings).where(eq(settings.shopId, shopId)).all();
    return reply.send(rows);
  });

  // PUT /settings — Upsert
  fastify.put('/settings', async (request, reply) => {
    const result = SettingSchema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() });
    const s = result.data;
    db.insert(settings).values(s).onConflictDoUpdate({
      target: settings.key,
      set: { value: s.value },
    }).run();
    return reply.send({ ok: true });
  });
}
