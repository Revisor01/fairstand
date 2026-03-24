import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { shops } from '../db/schema.js';
import { hashPin } from '../lib/crypto.js';

const PinAuthSchema = z.object({
  pin: z.string().min(4).max(8),
});

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/pin — PIN gegen shops-Tabelle prüfen, shopId + Token zurückgeben
  fastify.post('/auth/pin', async (request, reply) => {
    const result = PinAuthSchema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: 'Ungültige Anfrage' });

    const { pin } = result.data;
    const pinHash = await hashPin(pin);

    const shop = db.select().from(shops).where(eq(shops.pin, pinHash)).get();
    if (!shop) return reply.status(401).send({ error: 'Falscher PIN' });

    // Token = einfaches Session-Token (zufälliger String, kein JWT-Overhead)
    // Token wird client-seitig in idb-keyval gespeichert, kein server-seitiges Token-Management
    const token = crypto.randomUUID();

    return reply.send({
      shopId: shop.shopId,
      shopName: shop.name,
      token,
    });
  });
}
