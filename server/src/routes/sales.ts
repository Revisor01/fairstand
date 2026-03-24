import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

export async function salesRoutes(fastify: FastifyInstance) {
  // GET /sales?shopId=...&from=...&to=...
  fastify.get('/sales', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { from, to } = request.query as { from?: string; to?: string };

    if (!from || !to) {
      return reply.status(400).send({ error: 'from and to (Unix-ms) required' });
    }

    const fromTs = Number(from);
    const toTs = Number(to);

    if (isNaN(fromTs) || isNaN(toTs)) {
      return reply.status(400).send({ error: 'from and to must be numbers' });
    }

    const result = await db.execute(sql`
      SELECT
        id,
        shop_id,
        items,
        total_cents,
        paid_cents,
        change_cents,
        donation_cents,
        type,
        withdrawal_reason,
        created_at,
        synced_at,
        cancelled_at,
        returned_items
      FROM sales
      WHERE shop_id = ${shopId}
        AND created_at >= ${fromTs}
        AND created_at <= ${toTs}
      ORDER BY created_at DESC
    `);

    return reply.send(result.rows);
  });
}
