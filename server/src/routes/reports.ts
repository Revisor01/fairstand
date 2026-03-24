import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

export async function reportRoutes(fastify: FastifyInstance) {
  // GET /reports/monthly?shopId=xxx&year=2026&month=3
  fastify.get('/reports/monthly', async (request, reply) => {
    const { shopId, year, month } = request.query as { shopId: string; year: string; month: string };
    if (!shopId || !year || !month) return reply.status(400).send({ error: 'shopId, year, month required' });

    const y = Number(year);
    const m = Number(month);
    const monthStart = new Date(y, m - 1, 1).getTime();
    const monthEnd = new Date(y, m, 1).getTime();

    // Umsatz + Spenden aus sales
    const summary = db.all(sql`
      SELECT
        COUNT(*) as sale_count,
        COALESCE(SUM(total_cents), 0) as total_cents,
        COALESCE(SUM(donation_cents), 0) as donation_cents,
        COALESCE(SUM(paid_cents - change_cents - total_cents), 0) as extra_donation_cents
      FROM sales
      WHERE shop_id = ${shopId}
        AND created_at >= ${monthStart}
        AND created_at < ${monthEnd}
    `);

    // EK-Kosten (cost_cents) berechnet aus items JSON + products.purchase_price
    // JOIN auf products-Tabelle um purchasePrice * quantity zu summieren
    const costResult = db.all(sql`
      SELECT
        COALESCE(SUM(
          CAST(json_extract(item.value, '$.quantity') AS INTEGER) *
          COALESCE(p.purchase_price, 0)
        ), 0) as cost_cents
      FROM sales, json_each(sales.items) as item
      LEFT JOIN products p ON p.id = json_extract(item.value, '$.productId')
      WHERE sales.shop_id = ${shopId}
        AND sales.created_at >= ${monthStart}
        AND sales.created_at < ${monthEnd}
    `);

    const topArticles = db.all(sql`
      SELECT
        json_extract(item.value, '$.name') as name,
        SUM(CAST(json_extract(item.value, '$.quantity') AS INTEGER)) as total_qty,
        SUM(CAST(json_extract(item.value, '$.quantity') AS INTEGER) *
            CAST(json_extract(item.value, '$.salePrice') AS INTEGER)) as revenue_cents
      FROM sales, json_each(sales.items) as item
      WHERE sales.shop_id = ${shopId}
        AND sales.created_at >= ${monthStart}
        AND sales.created_at < ${monthEnd}
      GROUP BY json_extract(item.value, '$.productId')
      ORDER BY total_qty DESC
      LIMIT 5
    `);

    const summaryRow = summary[0] as Record<string, unknown> ?? {};
    const costRow = costResult[0] as Record<string, unknown> ?? {};
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
      topArticles,
    });
  });

  // GET /reports/yearly?shopId=xxx&year=2026 — alle 12 Monate als Array
  fastify.get('/reports/yearly', async (request, reply) => {
    const { shopId, year } = request.query as { shopId: string; year: string };
    if (!shopId || !year) return reply.status(400).send({ error: 'shopId, year required' });

    const y = Number(year);
    const yearStart = new Date(y, 0, 1).getTime();
    const yearEnd = new Date(y + 1, 0, 1).getTime();

    // Umsatz pro Monat
    const months = db.all(sql`
      SELECT
        CAST(strftime('%m', datetime(created_at / 1000, 'unixepoch')) AS INTEGER) as month,
        COUNT(*) as sale_count,
        COALESCE(SUM(total_cents), 0) as total_cents,
        COALESCE(SUM(donation_cents), 0) as donation_cents
      FROM sales
      WHERE shop_id = ${shopId}
        AND created_at >= ${yearStart}
        AND created_at < ${yearEnd}
      GROUP BY strftime('%m', datetime(created_at / 1000, 'unixepoch'))
      ORDER BY month
    `);

    // EK-Kosten pro Monat (separate Query fuer JOIN auf products)
    const monthlyCosts = db.all(sql`
      SELECT
        CAST(strftime('%m', datetime(sales.created_at / 1000, 'unixepoch')) AS INTEGER) as month,
        COALESCE(SUM(
          CAST(json_extract(item.value, '$.quantity') AS INTEGER) *
          COALESCE(p.purchase_price, 0)
        ), 0) as cost_cents
      FROM sales, json_each(sales.items) as item
      LEFT JOIN products p ON p.id = json_extract(item.value, '$.productId')
      WHERE sales.shop_id = ${shopId}
        AND sales.created_at >= ${yearStart}
        AND sales.created_at < ${yearEnd}
      GROUP BY strftime('%m', datetime(sales.created_at / 1000, 'unixepoch'))
      ORDER BY month
    `);

    // Merge: Umsatz + Kosten pro Monat
    const costMap = new Map((monthlyCosts as Record<string, unknown>[]).map(c => [Number(c.month), Number(c.cost_cents)]));
    const mergedMonths = (months as Record<string, unknown>[]).map(row => {
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

  // GET /reports/product/:id/stats?shopId=xxx&months=3
  fastify.get('/reports/product/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { shopId, months } = request.query as { shopId: string; months?: string };
    if (!shopId) return reply.status(400).send({ error: 'shopId required' });

    const monthsBack = Math.min(Math.max(Number(months ?? '3'), 1), 24);
    const since = new Date();
    since.setMonth(since.getMonth() - monthsBack);
    const sinceTs = since.getTime();

    const result = db.all(sql`
      SELECT
        COUNT(DISTINCT sales.id) as sale_count,
        COALESCE(SUM(CAST(json_extract(item.value, '$.quantity') AS INTEGER)), 0) as total_qty,
        COALESCE(SUM(
          CAST(json_extract(item.value, '$.quantity') AS INTEGER) *
          CAST(json_extract(item.value, '$.salePrice') AS INTEGER)
        ), 0) as revenue_cents,
        MIN(sales.created_at) as first_sale_at,
        MAX(sales.created_at) as last_sale_at
      FROM sales, json_each(sales.items) as item
      WHERE sales.shop_id = ${shopId}
        AND json_extract(item.value, '$.productId') = ${id}
        AND sales.created_at >= ${sinceTs}
    `);

    const row = (result[0] as Record<string, unknown>) ?? {};
    return reply.send({
      productId: id,
      period_months: monthsBack,
      since_ts: sinceTs,
      sale_count: Number(row.sale_count ?? 0),
      total_qty: Number(row.total_qty ?? 0),
      revenue_cents: Number(row.revenue_cents ?? 0),
      first_sale_at: row.first_sale_at ? Number(row.first_sale_at) : null,
      last_sale_at: row.last_sale_at ? Number(row.last_sale_at) : null,
    });
  });
}
