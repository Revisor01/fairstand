import type { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sales, products, stockMovements, shops } from '../db/schema.js';
import { broadcast } from './websocket.js';
import PDFDocument from 'pdfkit';

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

  // DELETE /sales/:id — permanently remove a sale and restock products
  fastify.delete<{ Params: { id: string } }>('/sales/:id', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { id } = request.params;

    // Look up the sale
    const [sale] = await db.select().from(sales).where(eq(sales.id, id)).limit(1);

    if (!sale || sale.shopId !== shopId) {
      return reply.status(404).send({ error: 'Verkauf nicht gefunden' });
    }

    const saleItems = (sale.items ?? []) as Array<{ productId: string; quantity: number }>;
    let stockAdjusted = false;

    await db.transaction(async (tx) => {
      // If sale is not cancelled, restock products
      if (!sale.cancelledAt) {
        for (const item of saleItems) {
          const [prod] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
          if (!prod || prod.shopId !== shopId) continue;
          await tx.update(products)
            .set({ stock: sql`${products.stock} + ${Number(item.quantity)}` })
            .where(eq(products.id, item.productId));
          // Stock-Movement für Hard-Delete-Restock protokollieren
          await tx.insert(stockMovements).values({
            shopId,
            productId: item.productId,
            type: 'hard_delete',
            quantity: Number(item.quantity), // positiv = Eingang (Restock)
            referenceSaleId: id,
            reason: 'Hard-Delete: Verkauf vollständig gelöscht',
            movedAt: Date.now(),
          });
        }
        stockAdjusted = true;
      }

      // Delete the sale
      await tx.delete(sales).where(eq(sales.id, id));
    });

    if (stockAdjusted) {
      broadcast({ type: 'products_changed', shopId });
    }

    return reply.send({ ok: true });
  });

  // GET /sales/:id/receipt-pdf — Einzelbeleg als PDF (EXP-03)
  fastify.get<{ Params: { id: string }; Querystring: { hideDonation?: string } }>('/sales/:id/receipt-pdf', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { id } = request.params;
    const hideDonation = request.query.hideDonation === 'true';

    const [sale] = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
    if (!sale || sale.shopId !== shopId) {
      return reply.status(404).send({ error: 'Verkauf nicht gefunden' });
    }

    const [shop] = await db.select().from(shops).where(eq(shops.shopId, shopId)).limit(1);
    const shopName = shop?.name ?? shopId;

    const saleItems = (sale.items ?? []) as Array<{ name: string; quantity: number; salePrice: number; purchasePrice?: number }>;

    const doc = new PDFDocument({ margin: 50 });

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="beleg-${sale.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf"`);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').fillColor('black').text(shopName, 50, 50);
    doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('Ev.-Luth. Kirchengemeinde St. Secundus Hennstedt', 50, 75);
    doc.fillColor('black').moveTo(50, 100).lineTo(545, 100).stroke();

    // Titel
    doc.fontSize(13).font('Helvetica-Bold').text('VERKAUFSBELEG', 50, 115);

    // Datum + Belegnummer
    const createdAt = Number(sale.createdAt);
    const dateStr = new Date(createdAt).toLocaleDateString('de-DE');
    const timeStr = new Date(createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    doc.fontSize(10).font('Helvetica').text(`${dateStr} ${timeStr}  ·  Beleg: ${sale.id.slice(0, 8).toUpperCase()}`, 50, 135);

    // Tabellenheader Artikel
    doc.moveTo(50, 160).lineTo(545, 160).stroke();
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Artikel', 50, 165, { width: 280 });
    doc.text('Menge', 330, 165, { width: 60, align: 'center' });
    doc.text('Preis', 440, 165, { width: 100, align: 'right' });
    doc.moveTo(50, 180).lineTo(545, 180).stroke();

    // Items
    let y = 185;
    doc.fontSize(10).font('Helvetica').fillColor('black');
    for (const item of saleItems) {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      doc.text(item.name, 50, y, { width: 280 });
      doc.text(String(item.quantity), 330, y, { width: 60, align: 'center' });
      doc.text(`${(item.salePrice * item.quantity / 100).toFixed(2)} EUR`, 440, y, { width: 100, align: 'right' });
      y += 20;
    }

    // Summen-Block
    doc.moveTo(50, y + 5).lineTo(545, y + 5).stroke();
    y += 15;

    const labelX = 340;
    const valueX = 440;
    const valueWidth = 100;

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Summe:', labelX, y, { width: 95 });
    doc.text(`${(Number(sale.totalCents) / 100).toFixed(2)} EUR`, valueX, y, { width: valueWidth, align: 'right' });
    y += 20;

    doc.font('Helvetica').fontSize(10);
    doc.text('Bezahlt:', labelX, y, { width: 95 });
    doc.text(`${(Number(sale.paidCents) / 100).toFixed(2)} EUR`, valueX, y, { width: valueWidth, align: 'right' });
    y += 18;

    if (Number(sale.changeCents) > 0) {
      doc.text('Wechselgeld:', labelX, y, { width: 95 });
      doc.text(`${(Number(sale.changeCents) / 100).toFixed(2)} EUR`, valueX, y, { width: valueWidth, align: 'right' });
      y += 18;
    }

    if (Number(sale.donationCents) > 0 && !hideDonation) {
      doc.fillColor('#059669').text('Spende:', labelX, y, { width: 95 });
      doc.text(`${(Number(sale.donationCents) / 100).toFixed(2)} EUR`, valueX, y, { width: valueWidth, align: 'right' });
      doc.fillColor('black');
      y += 18;
    }

    // Footer
    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica').text('Fairstand Kassensystem · Automatisch generiert', 50, y + 30);

    doc.end();
    return reply.send(doc);
  });
}
