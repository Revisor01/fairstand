import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

export async function reportRoutes(fastify: FastifyInstance) {
  // GET /reports/monthly?year=2026&month=3
  fastify.get('/reports/monthly', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { year, month } = request.query as { year: string; month: string };
    if (!year || !month) return reply.status(400).send({ error: 'year, month required' });

    const y = Number(year);
    const m = Number(month);
    const monthStart = new Date(y, m - 1, 1).getTime();
    const monthEnd = new Date(y, m, 1).getTime();

    // Umsatz + Spenden aus sales
    const summaryResult = await db.execute(sql`
      SELECT
        COUNT(*) as sale_count,
        COALESCE(SUM(total_cents), 0) as total_cents,
        COALESCE(SUM(donation_cents), 0) as donation_cents,
        COALESCE(SUM(paid_cents - change_cents - total_cents), 0) as extra_donation_cents
      FROM sales
      WHERE shop_id = ${shopId}
        AND created_at >= ${monthStart}
        AND created_at < ${monthEnd}
        AND cancelled_at IS NULL
        AND (type IS NULL OR type = 'sale')
    `);

    // EK-Kosten via jsonb + products.purchase_price
    const costResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(
          (item->>'quantity')::integer *
          COALESCE(p.purchase_price, 0)
        ), 0) as cost_cents
      FROM sales,
           jsonb_array_elements(sales.items) as item
      LEFT JOIN products p ON p.id = item->>'productId'
      WHERE sales.shop_id = ${shopId}
        AND sales.created_at >= ${monthStart}
        AND sales.created_at < ${monthEnd}
        AND sales.cancelled_at IS NULL
        AND (sales.type IS NULL OR sales.type = 'sale')
    `);

    const topArticles = await db.execute(sql`
      SELECT
        item->>'name' as name,
        SUM((item->>'quantity')::integer) as total_qty,
        SUM(CASE WHEN (sales.type IS NULL OR sales.type = 'sale') THEN (item->>'quantity')::integer ELSE 0 END) as sale_qty,
        SUM(CASE WHEN sales.type = 'withdrawal' THEN (item->>'quantity')::integer ELSE 0 END) as withdrawal_qty,
        SUM(CASE WHEN (sales.type IS NULL OR sales.type = 'sale') THEN (item->>'quantity')::integer * (item->>'salePrice')::integer ELSE 0 END) as revenue_cents
      FROM sales,
           jsonb_array_elements(sales.items) as item
      WHERE sales.shop_id = ${shopId}
        AND sales.created_at >= ${monthStart}
        AND sales.created_at < ${monthEnd}
        AND sales.cancelled_at IS NULL
      GROUP BY item->>'productId', item->>'name'
      ORDER BY total_qty DESC
      LIMIT 5
    `);

    const summaryRow = (summaryResult.rows[0] as Record<string, unknown>) ?? {};
    const costRow = (costResult.rows[0] as Record<string, unknown>) ?? {};
    const totalCents = Number(summaryRow.total_cents ?? 0);
    const costCents = Number(costRow.cost_cents ?? 0);

    return reply.send({
      summary: {
        sale_count: Number(summaryRow.sale_count ?? 0),
        total_cents: totalCents,
        cost_cents: costCents,
        margin_cents: totalCents - costCents,
        donation_cents: Number(summaryRow.donation_cents ?? 0),
        extra_donation_cents: Number(summaryRow.extra_donation_cents ?? 0),
      },
      topArticles: topArticles.rows,
    });
  });

  // GET /reports/yearly?year=2026 — alle 12 Monate als Array
  fastify.get('/reports/yearly', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { year } = request.query as { year: string };
    if (!year) return reply.status(400).send({ error: 'year required' });

    const y = Number(year);
    const yearStart = new Date(y, 0, 1).getTime();
    const yearEnd = new Date(y + 1, 0, 1).getTime();

    // Umsatz pro Monat — Timestamp in ms → PostgreSQL epoch-Umrechnung
    const monthsResult = await db.execute(sql`
      SELECT
        EXTRACT(MONTH FROM to_timestamp(created_at / 1000))::integer as month,
        COUNT(*) as sale_count,
        COALESCE(SUM(total_cents), 0) as total_cents,
        COALESCE(SUM(donation_cents), 0) as donation_cents
      FROM sales
      WHERE shop_id = ${shopId}
        AND created_at >= ${yearStart}
        AND created_at < ${yearEnd}
        AND cancelled_at IS NULL
        AND (type IS NULL OR type = 'sale')
      GROUP BY EXTRACT(MONTH FROM to_timestamp(created_at / 1000))
      ORDER BY month
    `);

    // EK-Kosten pro Monat
    const monthlyCostsResult = await db.execute(sql`
      SELECT
        EXTRACT(MONTH FROM to_timestamp(sales.created_at / 1000))::integer as month,
        COALESCE(SUM(
          (item->>'quantity')::integer *
          COALESCE(p.purchase_price, 0)
        ), 0) as cost_cents
      FROM sales,
           jsonb_array_elements(sales.items) as item
      LEFT JOIN products p ON p.id = item->>'productId'
      WHERE sales.shop_id = ${shopId}
        AND sales.created_at >= ${yearStart}
        AND sales.created_at < ${yearEnd}
        AND sales.cancelled_at IS NULL
        AND (sales.type IS NULL OR sales.type = 'sale')
      GROUP BY EXTRACT(MONTH FROM to_timestamp(sales.created_at / 1000))
      ORDER BY month
    `);

    // Merge: Umsatz + Kosten pro Monat
    const costMap = new Map((monthlyCostsResult.rows as Record<string, unknown>[]).map(c => [Number(c.month), Number(c.cost_cents)]));
    const mergedMonths = (monthsResult.rows as Record<string, unknown>[]).map(row => {
      const totalCents = Number(row.total_cents);
      const costCents = costMap.get(Number(row.month)) ?? 0;
      return {
        month: Number(row.month),
        sale_count: Number(row.sale_count),
        total_cents: totalCents,
        cost_cents: costCents,
        margin_cents: totalCents - costCents,
        donation_cents: Number(row.donation_cents),
      };
    });

    return reply.send({ year: y, months: mergedMonths });
  });

  // GET /reports/product/:id/stats?months=3
  fastify.get('/reports/product/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { months } = request.query as { months?: string };

    const monthsBack = Math.min(Math.max(Number(months ?? '3'), 1), 24);
    const since = new Date();
    since.setMonth(since.getMonth() - monthsBack);
    const sinceTs = since.getTime();

    // Verkäufe (type IS NULL oder 'sale')
    const salesResult = await db.execute(sql`
      SELECT
        COUNT(DISTINCT sales.id) as sale_count,
        COALESCE(SUM((item->>'quantity')::integer), 0) as total_qty,
        COALESCE(SUM(
          (item->>'quantity')::integer *
          (item->>'salePrice')::integer
        ), 0) as revenue_cents,
        MIN(sales.created_at) as first_sale_at,
        MAX(sales.created_at) as last_sale_at
      FROM sales,
           jsonb_array_elements(sales.items) as item
      WHERE sales.shop_id = ${shopId}
        AND item->>'productId' = ${id}
        AND sales.created_at >= ${sinceTs}
        AND sales.cancelled_at IS NULL
        AND (sales.type IS NULL OR sales.type = 'sale')
    `);

    // Entnahmen (type = 'withdrawal')
    const withdrawalResult = await db.execute(sql`
      SELECT
        COUNT(DISTINCT sales.id) as withdrawal_count,
        COALESCE(SUM((item->>'quantity')::integer), 0) as withdrawal_qty,
        COALESCE(SUM(
          (item->>'quantity')::integer *
          COALESCE((item->>'purchasePrice')::integer, 0)
        ), 0) as withdrawal_ek_cents
      FROM sales,
           jsonb_array_elements(sales.items) as item
      WHERE sales.shop_id = ${shopId}
        AND item->>'productId' = ${id}
        AND sales.created_at >= ${sinceTs}
        AND sales.cancelled_at IS NULL
        AND sales.type = 'withdrawal'
    `);

    const saleRow = (salesResult.rows[0] as Record<string, unknown>) ?? {};
    const wdRow = (withdrawalResult.rows[0] as Record<string, unknown>) ?? {};
    return reply.send({
      productId: id,
      period_months: monthsBack,
      since_ts: sinceTs,
      sale_count: Number(saleRow.sale_count ?? 0),
      total_qty: Number(saleRow.total_qty ?? 0),
      revenue_cents: Number(saleRow.revenue_cents ?? 0),
      first_sale_at: saleRow.first_sale_at ? Number(saleRow.first_sale_at) : null,
      last_sale_at: saleRow.last_sale_at ? Number(saleRow.last_sale_at) : null,
      withdrawal_count: Number(wdRow.withdrawal_count ?? 0),
      withdrawal_qty: Number(wdRow.withdrawal_qty ?? 0),
      withdrawal_ek_cents: Number(wdRow.withdrawal_ek_cents ?? 0),
    });
  });
}
