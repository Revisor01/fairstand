import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { parseSuedNordKontorPdf } from '../lib/pdfParser.js';
import { db } from '../db/index.js';
import { products, stockMovements, priceHistories } from '../db/schema.js';
import { broadcast } from './websocket.js';

const StockAdjustImportSchema = z.object({
  productId: z.string(),
  delta: z.number().int().positive(), // Import ist immer Eingang — nur positiv erlaubt
  purchasePriceCents: z.number().int().positive(), // EK aus Rechnung — Pflicht für Import
  reason: z.string().optional(),
  shopId: z.string(),
});

/**
 * Prueft ob ein Buffer ein gueltiges PDF ist anhand der Magic Bytes.
 * PDF-Dateien beginnen immer mit "%PDF" (0x25 0x50 0x44 0x46).
 */
function isPdf(buf: Buffer): boolean {
  return buf.length >= 4 &&
    buf[0] === 0x25 && // %
    buf[1] === 0x50 && // P
    buf[2] === 0x44 && // D
    buf[3] === 0x46;   // F
}

export async function importRoutes(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB max
      files: 1,
    },
  });

  fastify.post('/import/parse', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'Keine Datei uebermittelt' });
    }
    if (!data.filename.toLowerCase().endsWith('.pdf')) {
      return reply.status(400).send({ error: 'Nur PDF-Dateien erlaubt' });
    }

    try {
      const buffer = await data.toBuffer();
      if (!isPdf(buffer)) {
        return reply.status(400).send({ error: 'Datei ist kein gültiges PDF (Magic Bytes ungültig)' });
      }
      const rows = await parseSuedNordKontorPdf(buffer);
      return reply.send({ rows, filename: data.filename });
    } catch (err) {
      fastify.log.error(err, 'PDF-Parsing fehlgeschlagen');
      return reply.status(422).send({
        error: 'PDF konnte nicht verarbeitet werden',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  fastify.post('/stock/adjust', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const result = StockAdjustImportSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() });
    }
    const adj = result.data;

    // shopId-Ownership-Check
    if (adj.shopId !== session.shopId) {
      return reply.status(403).send({ error: 'Zugriff verweigert: shopId stimmt nicht überein' });
    }

    await db.transaction(async (tx) => {
      // Ownership-Check: Produkt muss zu diesem Shop gehören
      const [adjustProd] = await tx.select().from(products).where(eq(products.id, adj.productId)).limit(1);
      if (!adjustProd || adjustProd.shopId !== adj.shopId) {
        return reply.status(404).send({ error: 'Produkt nicht gefunden oder gehört nicht zu diesem Shop' });
      }

      // 1. Bestand erhöhen
      await tx.update(products)
        .set({ stock: sql`${products.stock} + ${adj.delta}`, updatedAt: sql`${Date.now()}` })
        .where(eq(products.id, adj.productId));

      // 2. restock-Bewegung mit EK-Preis speichern
      await tx.insert(stockMovements).values({
        shopId: adj.shopId,
        productId: adj.productId,
        type: 'restock',
        quantity: adj.delta,
        reason: adj.reason ?? 'Import Rechnung',
        purchasePriceCents: adj.purchasePriceCents,
        movedAt: Date.now(),
      });

      // 3. Wenn EK geändert: price_histories + Produkt-EK aktualisieren
      if (adj.purchasePriceCents !== adjustProd.purchasePrice) {
        await tx.insert(priceHistories).values({
          shopId: adj.shopId,
          productId: adj.productId,
          field: 'purchase_price',
          oldValue: adjustProd.purchasePrice,
          newValue: adj.purchasePriceCents,
          changedAt: Date.now(),
        });
        await tx.update(products)
          .set({ purchasePrice: adj.purchasePriceCents, updatedAt: sql`${Date.now()}` })
          .where(eq(products.id, adj.productId));
      }
    });

    broadcast({ type: 'stock_changed', shopId: adj.shopId });
    return reply.status(200).send({ ok: true });
  });
}
