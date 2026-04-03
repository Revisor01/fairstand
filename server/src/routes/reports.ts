import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stringify } from 'csv-stringify';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

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

  // GET /reports/inventory?year=2026 — Inventur-Übersicht pro Artikel
  fastify.get('/reports/inventory', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { year } = request.query as { year: string };
    if (!year) return reply.status(400).send({ error: 'year required' });

    const y = Number(year);
    const yearStart = new Date(y, 0, 1).getTime();
    const yearEnd = new Date(y + 1, 0, 1).getTime();

    // Query 1 — Inventur pro Artikel (alle aktiven Produkte, LEFT JOIN auf Verkäufe + Entnahmen)
    const inventoryResult = await db.execute(sql`
      SELECT
        p.id,
        p.article_number,
        p.name,
        p.stock as current_stock,
        p.purchase_price as current_ek_cents,
        COALESCE(SUM(
          CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
          THEN (item->>'quantity')::integer ELSE 0 END
        ), 0) as sold_qty,
        COALESCE(SUM(
          CASE WHEN sales.type = 'withdrawal'
          THEN (item->>'quantity')::integer ELSE 0 END
        ), 0) as withdrawn_qty,
        COALESCE(SUM(
          CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
          THEN (item->>'quantity')::integer * (item->>'salePrice')::integer ELSE 0 END
        ), 0) as revenue_cents,
        COALESCE(SUM(
          CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
          THEN (item->>'quantity')::integer *
               COALESCE((item->>'purchasePrice')::integer, p.purchase_price)
          ELSE 0 END
        ), 0) as cost_cents,
        COALESCE(SUM(
          CASE WHEN sales.type = 'withdrawal'
          THEN (item->>'quantity')::integer *
               COALESCE((item->>'purchasePrice')::integer, p.purchase_price)
          ELSE 0 END
        ), 0) as withdrawal_cost_cents
      FROM products p
      LEFT JOIN sales ON sales.shop_id = p.shop_id
                      AND sales.created_at >= ${yearStart}
                      AND sales.created_at < ${yearEnd}
                      AND sales.cancelled_at IS NULL
      LEFT JOIN jsonb_array_elements(sales.items) as item
        ON item->>'productId' = p.id
      WHERE p.shop_id = ${shopId}
        AND p.active = true
      GROUP BY p.id, p.name, p.article_number, p.stock, p.purchase_price
      ORDER BY p.name
    `);

    // Query 2 — Bestandswert-Summe
    const stockValueResult = await db.execute(sql`
      SELECT COALESCE(SUM(stock * purchase_price), 0) as total_stock_value_cents
      FROM products
      WHERE shop_id = ${shopId} AND active = true
    `);

    // Query 3 — Preisänderungen pro Artikel (aus price_histories)
    const priceChangesResult = await db.execute(sql`
      SELECT product_id, field, old_value, new_value, changed_at
      FROM price_histories
      WHERE shop_id = ${shopId}
        AND changed_at >= ${yearStart}
        AND changed_at < ${yearEnd}
      ORDER BY product_id, changed_at
    `);

    // Query 4 — Einzelne Sales mit Items + Zeitstempel (für Perioden-Zuordnung)
    const salesDetailResult = await db.execute(sql`
      SELECT
        item->>'productId' as product_id,
        (item->>'quantity')::integer as qty,
        (item->>'salePrice')::integer as vk_cents,
        COALESCE((item->>'purchasePrice')::integer, p.purchase_price) as ek_cents,
        (item->>'purchasePrice') IS NOT NULL as has_ek_snapshot,
        sales.created_at,
        CASE WHEN sales.type = 'withdrawal' THEN 'withdrawal' ELSE 'sale' END as sale_type
      FROM sales,
           jsonb_array_elements(sales.items) as item
      JOIN products p ON p.id = item->>'productId'
      WHERE sales.shop_id = ${shopId}
        AND sales.created_at >= ${yearStart}
        AND sales.created_at < ${yearEnd}
        AND sales.cancelled_at IS NULL
      ORDER BY product_id, sales.created_at
    `);

    // Preisperioden pro Artikel berechnen
    // Eine Periode = Zeitfenster mit konstantem EK+VK, abgeleitet aus price_histories
    type PricePeriod = {
      ek_cents: number; vk_cents: number;
      from: number; to: number;
      sold_qty: number; withdrawn_qty: number;
      revenue_cents: number; cost_cents: number; withdrawal_cost_cents: number;
    };

    // Initiale Preise pro Produkt ermitteln (vor dem Jahr oder aktuell als Fallback)
    const productInitialPrices = new Map<string, { ek: number; vk: number }>();
    for (const row of inventoryResult.rows as Record<string, unknown>[]) {
      const pid = String(row.id);
      productInitialPrices.set(pid, {
        ek: Number(row.current_ek_cents),
        vk: 0, // wird unten aus Produkt-Tabelle ergänzt
      });
    }

    // Aktuelle VK-Preise laden
    const vkResult = await db.execute(sql`
      SELECT id, sale_price FROM products WHERE shop_id = ${shopId} AND active = true
    `);
    for (const row of vkResult.rows as Record<string, unknown>[]) {
      const existing = productInitialPrices.get(String(row.id));
      if (existing) existing.vk = Number(row.sale_price);
    }

    // Initiale Preise zurückrechnen aus price_histories (rückwärts von ältester Änderung)
    for (const row of priceChangesResult.rows as Record<string, unknown>[]) {
      const pid = String(row.product_id);
      const initial = productInitialPrices.get(pid);
      if (!initial) continue;
      // Die älteste Änderung hat old_value = der Preis VOR dem Jahr
      // Wir setzen den initial-Preis nur einmal (erste Änderung pro Feld)
      if (String(row.field) === 'purchase_price' && initial.ek === Number(row.new_value)) {
        // Aktuelle EK = letzte Änderung; zurückrechnen zum Start
      }
    }
    // Einfacherer Ansatz: Perioden aus Änderungszeitpunkten ableiten
    const periodsMap = new Map<string, PricePeriod[]>();

    // Für jedes Produkt: Änderungs-Zeitpunkte sammeln, Perioden bilden
    const changesByProduct = new Map<string, Array<{ field: string; oldValue: number; newValue: number; changedAt: number }>>();
    for (const row of priceChangesResult.rows as Record<string, unknown>[]) {
      const pid = String(row.product_id);
      if (!changesByProduct.has(pid)) changesByProduct.set(pid, []);
      changesByProduct.get(pid)!.push({
        field: String(row.field),
        oldValue: Number(row.old_value),
        newValue: Number(row.new_value),
        changedAt: Number(row.changed_at),
      });
    }

    // Alle Produkte mit Aktivität verarbeiten
    const productsWithActivity = new Set<string>();
    for (const row of salesDetailResult.rows as Record<string, unknown>[]) {
      productsWithActivity.add(String(row.product_id));
    }
    for (const pid of changesByProduct.keys()) {
      productsWithActivity.add(pid);
    }

    for (const pid of productsWithActivity) {
      const changes = changesByProduct.get(pid) ?? [];
      const initial = productInitialPrices.get(pid);
      if (!initial) continue;

      // Startpreise rekonstruieren: von den ältesten Änderungen rückwärts
      let startEk = initial.ek;
      let startVk = initial.vk;
      // Sortiert nach changedAt — älteste zuerst
      const sortedChanges = [...changes].sort((a, b) => a.changedAt - b.changedAt);
      // Rückwärts rekonstruieren: der oldValue der frühesten Änderung ist der Startpreis
      for (const c of sortedChanges) {
        if (c.field === 'purchase_price') { startEk = c.oldValue; break; }
      }
      for (const c of sortedChanges) {
        if (c.field === 'sale_price') { startVk = c.oldValue; break; }
      }
      // Wenn keine Änderung für ein Feld: aktueller Preis = Startpreis (unverändert)
      if (!sortedChanges.some(c => c.field === 'purchase_price')) startEk = initial.ek;
      if (!sortedChanges.some(c => c.field === 'sale_price')) startVk = initial.vk;

      // Zeitpunkte der Preisänderungen sammeln (unique, sortiert)
      const changePoints = [...new Set(sortedChanges.map(c => c.changedAt))].sort((a, b) => a - b);

      // Perioden bilden
      const periods: PricePeriod[] = [];
      let curEk = startEk;
      let curVk = startVk;

      const boundaries = [yearStart, ...changePoints, yearEnd];
      for (let i = 0; i < boundaries.length - 1; i++) {
        const from = boundaries[i];
        const to = boundaries[i + 1];

        // Preisänderungen an diesem Zeitpunkt anwenden
        if (i > 0) {
          for (const c of sortedChanges) {
            if (c.changedAt === boundaries[i]) {
              if (c.field === 'purchase_price') curEk = c.newValue;
              if (c.field === 'sale_price') curVk = c.newValue;
            }
          }
        }

        periods.push({
          ek_cents: curEk, vk_cents: curVk,
          from, to,
          sold_qty: 0, withdrawn_qty: 0,
          revenue_cents: 0, cost_cents: 0, withdrawal_cost_cents: 0,
        });
      }

      // Verkäufe/Entnahmen den Perioden zuordnen
      for (const row of salesDetailResult.rows as Record<string, unknown>[]) {
        if (String(row.product_id) !== pid) continue;
        const createdAt = Number(row.created_at);
        const qty = Number(row.qty);
        const vk = Number(row.vk_cents);
        const hasEkSnapshot = row.has_ek_snapshot === true;
        const snapshotEk = Number(row.ek_cents);
        const saleType = String(row.sale_type);

        // Finde passende Periode
        const period = periods.find(p => createdAt >= p.from && createdAt < p.to);
        if (!period) continue;

        // EK: Sale-Snapshot wenn vorhanden, sonst EK der Periode (korrekt für Altdaten vor Phase 27)
        const ek = hasEkSnapshot ? snapshotEk : period.ek_cents;

        if (saleType === 'withdrawal') {
          period.withdrawn_qty += qty;
          period.withdrawal_cost_cents += qty * ek;
        } else {
          period.sold_qty += qty;
          period.revenue_cents += qty * vk;
          period.cost_cents += qty * ek;
        }
      }

      // Nur Perioden mit Aktivität behalten
      const activePeriods = periods.filter(p => p.sold_qty > 0 || p.withdrawn_qty > 0);
      if (activePeriods.length > 0) {
        periodsMap.set(pid, activePeriods);
      }
    }

    // Items zusammenbauen — EK-Kosten aus Preisperioden bevorzugen
    // Preisperioden verwenden den historischen EK (korrekt), die Hauptquery fällt
    // bei fehlendem purchasePrice auf den aktuellen EK zurück (falsch für Altdaten).
    const items = (inventoryResult.rows as Record<string, unknown>[]).map(row => {
      const pid = String(row.id);
      const periods = periodsMap.get(pid) ?? [];
      const hasPeriods = periods.length > 0;
      return {
        id: pid,
        article_number: String(row.article_number),
        name: String(row.name),
        current_stock: Number(row.current_stock),
        current_ek_cents: Number(row.current_ek_cents),
        sold_qty: Number(row.sold_qty),
        withdrawn_qty: Number(row.withdrawn_qty),
        revenue_cents: hasPeriods
          ? periods.reduce((s, p) => s + p.revenue_cents, 0)
          : Number(row.revenue_cents),
        cost_cents: hasPeriods
          ? periods.reduce((s, p) => s + p.cost_cents, 0)
          : Number(row.cost_cents),
        withdrawal_cost_cents: hasPeriods
          ? periods.reduce((s, p) => s + p.withdrawal_cost_cents, 0)
          : Number(row.withdrawal_cost_cents),
        price_periods: periods,
      };
    });

    // Query 5 — Wareneingänge im Jahr (positive stock_movements = Einkauf/Retoure)
    // EK wird über Preisperioden zum Zeitpunkt der Bewegung bestimmt
    const stockInResult = await db.execute(sql`
      SELECT
        sm.product_id,
        sm.quantity,
        sm.moved_at
      FROM stock_movements sm
      WHERE sm.shop_id = ${shopId}
        AND sm.moved_at >= ${yearStart}
        AND sm.moved_at < ${yearEnd}
        AND sm.quantity > 0
        AND sm.type IN ('adjustment', 'return')
      ORDER BY sm.product_id, sm.moved_at
    `);

    // Wareneingänge den Preisperioden zuordnen für korrekten EK
    let totalPurchasedCents = 0;
    for (const row of stockInResult.rows as Record<string, unknown>[]) {
      const pid = String(row.product_id);
      const qty = Number(row.quantity);
      const movedAt = Number(row.moved_at);
      const periods = periodsMap.get(pid);
      if (periods) {
        const period = periods.find(p => movedAt >= p.from && movedAt < p.to);
        if (period) {
          totalPurchasedCents += qty * period.ek_cents;
          continue;
        }
      }
      // Fallback: aktueller EK des Produkts
      const item = items.find(i => i.id === pid);
      totalPurchasedCents += qty * (item?.current_ek_cents ?? 0);
    }

    // Auch Produkte die im Jahr angelegt wurden (Erstbestand) berücksichtigen
    // Die kommen nicht als stock_movement rein, sondern über den PDF-Import
    // Wir erfassen sie nicht separat — der Bestandswert + verkaufte EK-Kosten ist die Annäherung

    const stockValueRow = (stockValueResult.rows[0] as Record<string, unknown>) ?? {};
    return reply.send({
      year: y,
      items,
      total_stock_value_cents: Number(stockValueRow.total_stock_value_cents ?? 0),
      total_purchased_cents: totalPurchasedCents,
    });
  });

  // GET /reports/sales-csv?from=...&to=... — Verkaufshistorie als CSV (EXP-01)
  fastify.get('/reports/sales-csv', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { from, to } = request.query as { from?: string; to?: string };
    if (!from || !to) return reply.status(400).send({ error: 'from and to (Unix-ms) required' });

    const fromTs = Number(from);
    const toTs = Number(to);
    if (isNaN(fromTs) || isNaN(toTs)) return reply.status(400).send({ error: 'from and to must be numbers' });

    const salesResult = await db.execute(sql`
      SELECT id, items, total_cents, paid_cents, change_cents, donation_cents, created_at
      FROM sales
      WHERE shop_id = ${shopId}
        AND created_at >= ${fromTs}
        AND created_at <= ${toTs}
        AND cancelled_at IS NULL
        AND (type IS NULL OR type = 'sale')
      ORDER BY created_at ASC
    `);

    const rows = salesResult.rows as Array<Record<string, unknown>>;
    const today = new Date().toISOString().slice(0, 10);

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="verkaufshistorie-${today}.csv"`);

    const stringifier = stringify({
      delimiter: ';',
      bom: true,
      quoted: true,
      header: true,
      columns: ['Datum', 'Uhrzeit', 'Artikel', 'Menge', 'VK (EUR)', 'EK (EUR)', 'Summe Artikel (EUR)', 'Gesamtsumme (EUR)', 'Bezahlt (EUR)', 'Wechselgeld (EUR)', 'Spende (EUR)'],
    });

    stringifier.on('error', (_err) => {
      reply.status(500).send({ error: 'CSV generation failed' });
    });

    for (const sale of rows) {
      const items = (sale.items ?? []) as Array<{ name: string; quantity: number; salePrice: number; purchasePrice?: number }>;
      const createdAt = Number(sale.created_at);
      const dateStr = new Date(createdAt).toLocaleDateString('de-DE');
      const timeStr = new Date(createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const totalCents = Number(sale.total_cents);
      const paidCents = Number(sale.paid_cents);
      const changeCents = Number(sale.change_cents);
      const donationCents = Number(sale.donation_cents);

      items.forEach((item, idx) => {
        const isFirst = idx === 0;
        stringifier.write({
          'Datum': dateStr,
          'Uhrzeit': timeStr,
          'Artikel': item.name,
          'Menge': item.quantity,
          'VK (EUR)': (item.salePrice / 100).toFixed(2),
          'EK (EUR)': ((item.purchasePrice ?? 0) / 100).toFixed(2),
          'Summe Artikel (EUR)': (item.salePrice * item.quantity / 100).toFixed(2),
          'Gesamtsumme (EUR)': isFirst ? (totalCents / 100).toFixed(2) : '',
          'Bezahlt (EUR)': isFirst ? (paidCents / 100).toFixed(2) : '',
          'Wechselgeld (EUR)': isFirst ? (changeCents / 100).toFixed(2) : '',
          'Spende (EUR)': isFirst ? (donationCents / 100).toFixed(2) : '',
        });
      });
    }

    stringifier.end();
    return reply.send(stringifier);
  });

  // GET /reports/inventory-csv?year=... — Inventur als CSV (EXP-02)
  fastify.get('/reports/inventory-csv', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { year } = request.query as { year?: string };
    if (!year) return reply.status(400).send({ error: 'year required' });

    const y = Number(year);
    const yearStart = new Date(y, 0, 1).getTime();
    const yearEnd = new Date(y + 1, 0, 1).getTime();

    const inventoryResult = await db.execute(sql`
      SELECT
        p.id,
        p.article_number,
        p.name,
        p.stock as current_stock,
        p.purchase_price as current_ek_cents,
        COALESCE(SUM(
          CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
          THEN (item->>'quantity')::integer ELSE 0 END
        ), 0) as sold_qty,
        COALESCE(SUM(
          CASE WHEN sales.type = 'withdrawal'
          THEN (item->>'quantity')::integer ELSE 0 END
        ), 0) as withdrawn_qty,
        COALESCE(SUM(
          CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
          THEN (item->>'quantity')::integer * (item->>'salePrice')::integer ELSE 0 END
        ), 0) as revenue_cents,
        COALESCE(SUM(
          CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
          THEN (item->>'quantity')::integer *
               COALESCE((item->>'purchasePrice')::integer, p.purchase_price)
          ELSE 0 END
        ), 0) as cost_cents,
        COALESCE(SUM(
          CASE WHEN sales.type = 'withdrawal'
          THEN (item->>'quantity')::integer *
               COALESCE((item->>'purchasePrice')::integer, p.purchase_price)
          ELSE 0 END
        ), 0) as withdrawal_cost_cents
      FROM products p
      LEFT JOIN sales ON sales.shop_id = p.shop_id
                      AND sales.created_at >= ${yearStart}
                      AND sales.created_at < ${yearEnd}
                      AND sales.cancelled_at IS NULL
      LEFT JOIN jsonb_array_elements(sales.items) as item
        ON item->>'productId' = p.id
      WHERE p.shop_id = ${shopId}
        AND p.active = true
      GROUP BY p.id, p.name, p.article_number, p.stock, p.purchase_price
      ORDER BY p.name
    `);

    const stockValueResult = await db.execute(sql`
      SELECT COALESCE(SUM(stock * purchase_price), 0) as total_stock_value_cents
      FROM products
      WHERE shop_id = ${shopId} AND active = true
    `);

    const items = (inventoryResult.rows as Record<string, unknown>[]).map(row => ({
      id: String(row.id),
      article_number: String(row.article_number),
      name: String(row.name),
      current_stock: Number(row.current_stock),
      current_ek_cents: Number(row.current_ek_cents),
      sold_qty: Number(row.sold_qty),
      withdrawn_qty: Number(row.withdrawn_qty),
      revenue_cents: Number(row.revenue_cents),
      cost_cents: Number(row.cost_cents),
      withdrawal_cost_cents: Number(row.withdrawal_cost_cents),
    }));

    const stockValueRow = (stockValueResult.rows[0] as Record<string, unknown>) ?? {};
    const totalStockValueCents = Number(stockValueRow.total_stock_value_cents ?? 0);

    // Bilanz berechnen
    const totalRevenue = items.reduce((s, i) => s + i.revenue_cents, 0);
    const totalWithdrawalCost = items.reduce((s, i) => s + i.withdrawal_cost_cents, 0);
    const totalCost = items.reduce((s, i) => s + i.cost_cents + i.withdrawal_cost_cents, 0);
    const margin = totalRevenue + totalWithdrawalCost - totalCost;

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="inventur-${year}-${shopId}.csv"`);

    const stringifier = stringify({
      delimiter: ';',
      bom: true,
      quoted: true,
      header: true,
      columns: ['Artikelname', 'Artikelnummer', 'Bestand', 'Verkauft', 'Entnahme', 'VK-Umsatz (EUR)', 'Entnahme EK (EUR)', 'EK-Kosten (EUR)', 'Bestandswert (EUR)'],
    });

    stringifier.on('error', (_err) => {
      reply.status(500).send({ error: 'CSV generation failed' });
    });

    for (const item of items) {
      stringifier.write({
        'Artikelname': item.name,
        'Artikelnummer': item.article_number,
        'Bestand': item.current_stock,
        'Verkauft': item.sold_qty,
        'Entnahme': item.withdrawn_qty,
        'VK-Umsatz (EUR)': (item.revenue_cents / 100).toFixed(2),
        'Entnahme EK (EUR)': (item.withdrawal_cost_cents / 100).toFixed(2),
        'EK-Kosten (EUR)': ((item.cost_cents + item.withdrawal_cost_cents) / 100).toFixed(2),
        'Bestandswert (EUR)': (item.current_stock * item.current_ek_cents / 100).toFixed(2),
      });
    }

    // Bilanz-Zeilen
    stringifier.write({ 'Artikelname': '', 'Artikelnummer': '', 'Bestand': '', 'Verkauft': '', 'Entnahme': '', 'VK-Umsatz (EUR)': '', 'Entnahme EK (EUR)': '', 'EK-Kosten (EUR)': '', 'Bestandswert (EUR)': '' });
    stringifier.write({ 'Artikelname': 'BILANZ', 'Artikelnummer': '', 'Bestand': '', 'Verkauft': '', 'Entnahme': '', 'VK-Umsatz (EUR)': '', 'Entnahme EK (EUR)': '', 'EK-Kosten (EUR)': '', 'Bestandswert (EUR)': '' });
    stringifier.write({ 'Artikelname': 'Einnahmen aus Verkauf (VK)', 'Artikelnummer': '', 'Bestand': '', 'Verkauft': '', 'Entnahme': '', 'VK-Umsatz (EUR)': (totalRevenue / 100).toFixed(2), 'Entnahme EK (EUR)': '', 'EK-Kosten (EUR)': '', 'Bestandswert (EUR)': '' });
    stringifier.write({ 'Artikelname': 'Einnahmen aus Entnahme (EK)', 'Artikelnummer': '', 'Bestand': '', 'Verkauft': '', 'Entnahme': '', 'VK-Umsatz (EUR)': '', 'Entnahme EK (EUR)': (totalWithdrawalCost / 100).toFixed(2), 'EK-Kosten (EUR)': '', 'Bestandswert (EUR)': '' });
    stringifier.write({ 'Artikelname': 'Gesamt EK-Kosten', 'Artikelnummer': '', 'Bestand': '', 'Verkauft': '', 'Entnahme': '', 'VK-Umsatz (EUR)': '', 'Entnahme EK (EUR)': '', 'EK-Kosten (EUR)': (totalCost / 100).toFixed(2), 'Bestandswert (EUR)': '' });
    stringifier.write({ 'Artikelname': 'Marge', 'Artikelnummer': '', 'Bestand': '', 'Verkauft': '', 'Entnahme': '', 'VK-Umsatz (EUR)': (margin / 100).toFixed(2), 'Entnahme EK (EUR)': '', 'EK-Kosten (EUR)': '', 'Bestandswert (EUR)': (totalStockValueCents / 100).toFixed(2) });

    stringifier.end();
    return reply.send(stringifier);
  });

  // GET /reports/inventory-xlsx?year=... — Inventur als Excel (EXP-04)
  fastify.get('/reports/inventory-xlsx', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { year } = request.query as { year?: string };
    if (!year) return reply.status(400).send({ error: 'year required' });

    const y = Number(year);
    const yearStart = new Date(y, 0, 1).getTime();
    const yearEnd = new Date(y + 1, 0, 1).getTime();

    const inventoryResult = await db.execute(sql`
      SELECT
        p.id,
        p.article_number,
        p.name,
        p.stock as current_stock,
        p.purchase_price as current_ek_cents,
        COALESCE(SUM(
          CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
          THEN (item->>'quantity')::integer ELSE 0 END
        ), 0) as sold_qty,
        COALESCE(SUM(
          CASE WHEN sales.type = 'withdrawal'
          THEN (item->>'quantity')::integer ELSE 0 END
        ), 0) as withdrawn_qty,
        COALESCE(SUM(
          CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
          THEN (item->>'quantity')::integer * (item->>'salePrice')::integer ELSE 0 END
        ), 0) as revenue_cents,
        COALESCE(SUM(
          CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
          THEN (item->>'quantity')::integer *
               COALESCE((item->>'purchasePrice')::integer, p.purchase_price)
          ELSE 0 END
        ), 0) as cost_cents,
        COALESCE(SUM(
          CASE WHEN sales.type = 'withdrawal'
          THEN (item->>'quantity')::integer *
               COALESCE((item->>'purchasePrice')::integer, p.purchase_price)
          ELSE 0 END
        ), 0) as withdrawal_cost_cents
      FROM products p
      LEFT JOIN sales ON sales.shop_id = p.shop_id
                      AND sales.created_at >= ${yearStart}
                      AND sales.created_at < ${yearEnd}
                      AND sales.cancelled_at IS NULL
      LEFT JOIN jsonb_array_elements(sales.items) as item
        ON item->>'productId' = p.id
      WHERE p.shop_id = ${shopId}
        AND p.active = true
      GROUP BY p.id, p.name, p.article_number, p.stock, p.purchase_price
      ORDER BY p.name
    `);

    const stockValueResult = await db.execute(sql`
      SELECT COALESCE(SUM(stock * purchase_price), 0) as total_stock_value_cents
      FROM products
      WHERE shop_id = ${shopId} AND active = true
    `);

    const items = (inventoryResult.rows as Record<string, unknown>[]).map(row => ({
      name: String(row.name),
      article_number: String(row.article_number),
      current_stock: Number(row.current_stock),
      current_ek_cents: Number(row.current_ek_cents),
      sold_qty: Number(row.sold_qty),
      withdrawn_qty: Number(row.withdrawn_qty),
      revenue_cents: Number(row.revenue_cents),
      cost_cents: Number(row.cost_cents),
      withdrawal_cost_cents: Number(row.withdrawal_cost_cents),
    }));

    const stockValueRow = (stockValueResult.rows[0] as Record<string, unknown>) ?? {};
    const totalStockValueCents = Number(stockValueRow.total_stock_value_cents ?? 0);
    const totalRevenue = items.reduce((s, i) => s + i.revenue_cents, 0);
    const totalWithdrawalCost = items.reduce((s, i) => s + i.withdrawal_cost_cents, 0);
    const totalCost = items.reduce((s, i) => s + i.cost_cents + i.withdrawal_cost_cents, 0);
    const margin = totalRevenue + totalWithdrawalCost - totalCost;

    const wsData: (string | number)[][] = [
      ['Artikelname', 'Artikelnummer', 'Bestand', 'Verkauft', 'Entnahme', 'VK-Umsatz (EUR)', 'Entnahme EK (EUR)', 'EK-Kosten (EUR)', 'Bestandswert (EUR)'],
    ];

    for (const item of items) {
      wsData.push([
        item.name,
        item.article_number,
        item.current_stock,
        item.sold_qty,
        item.withdrawn_qty,
        Number((item.revenue_cents / 100).toFixed(2)),
        Number((item.withdrawal_cost_cents / 100).toFixed(2)),
        Number(((item.cost_cents + item.withdrawal_cost_cents) / 100).toFixed(2)),
        Number((item.current_stock * item.current_ek_cents / 100).toFixed(2)),
      ]);
    }

    wsData.push(['', '', '', '', '', '', '', '', '']);
    wsData.push(['BILANZ', '', '', '', '', '', '', '', '']);
    wsData.push(['Einnahmen aus Verkauf (VK)', '', '', '', '', Number((totalRevenue / 100).toFixed(2)), '', '', '']);
    wsData.push(['Einnahmen aus Entnahme (EK)', '', '', '', '', '', Number((totalWithdrawalCost / 100).toFixed(2)), '', '']);
    wsData.push(['Gesamt EK-Kosten', '', '', '', '', '', '', Number((totalCost / 100).toFixed(2)), '']);
    wsData.push(['Marge', '', '', '', '', Number((margin / 100).toFixed(2)), '', '', Number((totalStockValueCents / 100).toFixed(2))]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Inventur ${year}`);

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename="inventur-${year}.xlsx"`);
    return reply.send(buf);
  });

  // GET /reports/sales-xlsx?from=...&to=... — Verkaufshistorie als Excel (EXP-05)
  fastify.get('/reports/sales-xlsx', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { from, to } = request.query as { from?: string; to?: string };
    if (!from || !to) return reply.status(400).send({ error: 'from and to (Unix-ms) required' });

    const fromTs = Number(from);
    const toTs = Number(to);
    if (isNaN(fromTs) || isNaN(toTs)) return reply.status(400).send({ error: 'from and to must be numbers' });

    const salesResult = await db.execute(sql`
      SELECT id, items, total_cents, paid_cents, change_cents, donation_cents, created_at
      FROM sales
      WHERE shop_id = ${shopId}
        AND created_at >= ${fromTs}
        AND created_at <= ${toTs}
        AND cancelled_at IS NULL
        AND (type IS NULL OR type = 'sale')
      ORDER BY created_at ASC
    `);

    const rows = salesResult.rows as Array<Record<string, unknown>>;
    const today = new Date().toISOString().slice(0, 10);

    const wsData: (string | number)[][] = [
      ['Datum', 'Uhrzeit', 'Artikel', 'Menge', 'VK (EUR)', 'EK (EUR)', 'Summe Artikel (EUR)', 'Gesamtsumme (EUR)', 'Bezahlt (EUR)', 'Wechselgeld (EUR)', 'Spende (EUR)'],
    ];

    for (const sale of rows) {
      const saleItems = (sale.items ?? []) as Array<{ name: string; quantity: number; salePrice: number; purchasePrice?: number }>;
      const createdAt = Number(sale.created_at);
      const dateStr = new Date(createdAt).toLocaleDateString('de-DE');
      const timeStr = new Date(createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const totalCents = Number(sale.total_cents);
      const paidCents = Number(sale.paid_cents);
      const changeCents = Number(sale.change_cents);
      const donationCents = Number(sale.donation_cents);

      saleItems.forEach((item, idx) => {
        const isFirst = idx === 0;
        wsData.push([
          dateStr,
          timeStr,
          item.name,
          item.quantity,
          Number((item.salePrice / 100).toFixed(2)),
          Number(((item.purchasePrice ?? 0) / 100).toFixed(2)),
          Number((item.salePrice * item.quantity / 100).toFixed(2)),
          isFirst ? Number((totalCents / 100).toFixed(2)) : '',
          isFirst ? Number((paidCents / 100).toFixed(2)) : '',
          isFirst ? Number((changeCents / 100).toFixed(2)) : '',
          isFirst ? Number((donationCents / 100).toFixed(2)) : '',
        ]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Verkaufshistorie');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename="verkaufshistorie-${today}.xlsx"`);
    return reply.send(buf);
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

  // GET /reports/inventory-pdf?year=... — Inventur als PDF (EXP-02)
  fastify.get('/reports/inventory-pdf', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { year } = request.query as { year?: string };
    if (!year) return reply.status(400).send({ error: 'year required' });

    const yearNum = Number(year);
    const yearStart = new Date(yearNum, 0, 1).getTime();
    const yearEnd = new Date(yearNum + 1, 0, 1).getTime();

    const inventoryResult = await db.execute(sql`
      SELECT
        p.id,
        p.article_number,
        p.name,
        p.stock as current_stock,
        p.purchase_price as current_ek_cents,
        COALESCE(SUM(
          CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
          THEN (item->>'quantity')::integer ELSE 0 END
        ), 0) as sold_qty,
        COALESCE(SUM(
          CASE WHEN sales.type = 'withdrawal'
          THEN (item->>'quantity')::integer ELSE 0 END
        ), 0) as withdrawn_qty,
        COALESCE(SUM(
          CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
          THEN (item->>'quantity')::integer * (item->>'salePrice')::integer ELSE 0 END
        ), 0) as revenue_cents,
        COALESCE(SUM(
          CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
          THEN (item->>'quantity')::integer *
               COALESCE((item->>'purchasePrice')::integer, p.purchase_price)
          ELSE 0 END
        ), 0) as cost_cents,
        COALESCE(SUM(
          CASE WHEN sales.type = 'withdrawal'
          THEN (item->>'quantity')::integer *
               COALESCE((item->>'purchasePrice')::integer, p.purchase_price)
          ELSE 0 END
        ), 0) as withdrawal_cost_cents
      FROM products p
      LEFT JOIN sales ON sales.shop_id = p.shop_id
                      AND sales.created_at >= ${yearStart}
                      AND sales.created_at < ${yearEnd}
                      AND sales.cancelled_at IS NULL
      LEFT JOIN jsonb_array_elements(sales.items) as item
        ON item->>'productId' = p.id
      WHERE p.shop_id = ${shopId}
        AND p.active = true
      GROUP BY p.id, p.name, p.article_number, p.stock, p.purchase_price
      ORDER BY p.name
    `);

    const stockValueResult = await db.execute(sql`
      SELECT COALESCE(SUM(stock * purchase_price), 0) as total_stock_value_cents
      FROM products
      WHERE shop_id = ${shopId} AND active = true
    `);

    const shopNameResult = await db.execute(sql`
      SELECT name FROM shops WHERE shop_id = ${shopId} LIMIT 1
    `);
    const shopName = String((shopNameResult.rows[0] as Record<string, unknown>)?.name ?? shopId);

    const items = (inventoryResult.rows as Record<string, unknown>[]).map(row => ({
      name: String(row.name),
      article_number: String(row.article_number),
      current_stock: Number(row.current_stock),
      current_ek_cents: Number(row.current_ek_cents),
      sold_qty: Number(row.sold_qty),
      withdrawn_qty: Number(row.withdrawn_qty),
      revenue_cents: Number(row.revenue_cents),
      cost_cents: Number(row.cost_cents),
      withdrawal_cost_cents: Number(row.withdrawal_cost_cents),
    }));

    const stockValueRow = (stockValueResult.rows[0] as Record<string, unknown>) ?? {};
    const totalStockValueCents = Number(stockValueRow.total_stock_value_cents ?? 0);
    const totalRevenue = items.reduce((s, i) => s + i.revenue_cents, 0);
    const totalWithdrawalCost = items.reduce((s, i) => s + i.withdrawal_cost_cents, 0);
    const totalCost = items.reduce((s, i) => s + i.cost_cents + i.withdrawal_cost_cents, 0);
    const margin = totalRevenue + totalWithdrawalCost - totalCost;

    const doc = new PDFDocument({ margin: 50 });

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="inventur-${year}-${shopId}.pdf"`);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(`Inventur ${year}`, 50, 50);
    doc.fontSize(11).font('Helvetica').text(`${shopName} · Erstellt: ${new Date().toLocaleDateString('de-DE')}`, 50, 78);
    doc.moveTo(50, 95).lineTo(545, 95).stroke();

    // Tabellenheader
    const colHeaders = ['Artikel', 'Bestand', 'Verkauf', 'Entnahme', 'VK-Umsatz', 'Entnahme EK', 'EK-Kosten'];
    const colWidths = [160, 50, 50, 55, 70, 70, 70];
    const colX = [50, 210, 260, 310, 365, 435, 505];
    let y = 110;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('black');
    colHeaders.forEach((header, i) => {
      const align = i >= 1 ? 'right' : 'left';
      doc.text(header, colX[i], y, { width: colWidths[i], align });
    });
    doc.moveTo(50, y + 14).lineTo(575, y + 14).stroke();

    // Items
    y = 135;
    doc.fontSize(8).font('Helvetica').fillColor('black');
    for (const item of items) {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }
      const rowValues = [
        item.name,
        String(item.current_stock),
        String(item.sold_qty),
        item.withdrawn_qty ? String(item.withdrawn_qty) : '',
        (item.revenue_cents / 100).toFixed(2),
        item.withdrawal_cost_cents ? (item.withdrawal_cost_cents / 100).toFixed(2) : '',
        ((item.cost_cents + item.withdrawal_cost_cents) / 100).toFixed(2),
      ];
      rowValues.forEach((val, i) => {
        const align = i >= 1 ? 'right' : 'left';
        doc.text(val, colX[i], y, { width: colWidths[i], align });
      });
      y += 16;
    }

    // Trennlinie + Bilanz
    doc.moveTo(50, y + 2).lineTo(575, y + 2).stroke();
    y += 14;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('BILANZ', 50, y); y += 18;
    doc.font('Helvetica').fontSize(9);
    doc.text('Einnahmen aus Verkauf (VK):', 50, y);
    doc.text(`${(totalRevenue / 100).toFixed(2)} EUR`, 400, y, { width: 175, align: 'right' }); y += 16;
    doc.text('Einnahmen aus Entnahme (EK):', 50, y);
    doc.text(`${(totalWithdrawalCost / 100).toFixed(2)} EUR`, 400, y, { width: 175, align: 'right' }); y += 16;
    doc.text('Gesamt EK-Kosten:', 50, y);
    doc.text(`- ${(totalCost / 100).toFixed(2)} EUR`, 400, y, { width: 175, align: 'right' }); y += 4;
    doc.moveTo(50, y + 8).lineTo(575, y + 8).stroke(); y += 14;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Marge:', 50, y);
    doc.text(`${(margin / 100).toFixed(2)} EUR`, 400, y, { width: 175, align: 'right' }); y += 20;
    doc.font('Helvetica').fontSize(9);
    doc.text('Bestandswert (akt. EK):', 50, y);
    doc.text(`${(totalStockValueCents / 100).toFixed(2)} EUR`, 400, y, { width: 175, align: 'right' });

    // Footer
    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica').text('Fairstand Kassensystem · Ev.-Luth. Kirchengemeinde', 50, 790);

    doc.end();
    return reply.send(doc);
  });
}
