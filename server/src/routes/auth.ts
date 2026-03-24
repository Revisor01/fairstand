import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { shops } from '../db/schema.js';
import { hashPin } from '../lib/crypto.js';
import { createSession } from '../lib/sessions.js';

const PinAuthSchema = z.object({
  pin: z.string().min(4).max(8),
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/pin', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
          error: 'Zu viele Versuche. Bitte 1 Minute warten.',
        }),
      },
    },
  }, async (request, reply) => {
    const result = PinAuthSchema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: 'Ungültige Anfrage' });

    const { pin } = result.data;
    const pinHash = await hashPin(pin);

    const shop = db.select().from(shops).where(eq(shops.pin, pinHash)).get();
    if (!shop) return reply.status(401).send({ error: 'Falscher PIN' });

    const token = crypto.randomUUID();
    createSession(token, shop.shopId);

    return reply.send({
      shopId: shop.shopId,
      shopName: shop.name,
      token,
    });
  });
}
