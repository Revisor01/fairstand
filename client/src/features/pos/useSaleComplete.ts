import { db, SHOP_ID } from '../../db/index.js';
import type { CartItem, Sale } from '../../db/index.js';

/**
 * Schreibt einen Verkauf atomar in Dexie:
 * - Sale in db.sales
 * - Bestandsreduzierung (Delta) in db.products
 * - OutboxEntry für Sync in db.outbox
 *
 * Pattern 2 aus RESEARCH.md: db.transaction('rw', ...)
 */
export async function completeSale(
  items: CartItem[],
  paidCents: number,
  changeCents: number
): Promise<Sale> {
  const totalCents = items.reduce((sum, i) => sum + i.salePrice * i.quantity, 0);

  if (paidCents < totalCents) {
    throw new Error(`Bezahlt (${paidCents}) ist weniger als Gesamtpreis (${totalCents})`);
  }

  const donationCents = paidCents - totalCents - changeCents;

  if (donationCents < 0) {
    throw new Error(`Wechselgeld (${changeCents}) größer als Differenz (${paidCents - totalCents})`);
  }

  const sale: Sale = {
    id: crypto.randomUUID(),
    shopId: SHOP_ID,
    items,
    totalCents,
    paidCents,
    changeCents,
    donationCents,
    createdAt: Date.now(),
  };

  await db.transaction('rw', [db.sales, db.products, db.outbox], async () => {
    await db.sales.add(sale);

    for (const item of items) {
      await db.products
        .where('id')
        .equals(item.productId)
        .modify((p: { stock: number; updatedAt: number }) => {
          p.stock -= item.quantity;
          p.updatedAt = Date.now();
        });
    }

    await db.outbox.add({
      operation: 'SALE_COMPLETE',
      payload: sale,
      shopId: SHOP_ID,
      createdAt: Date.now(),
      attempts: 0,
    });
  });

  return sale;
}
