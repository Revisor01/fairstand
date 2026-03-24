import { db, getShopId } from '../../db/index.js';
import type { CartItem, Sale, Product } from '../../db/index.js';

/**
 * Schreibt einen Verkauf atomar in Dexie:
 * - Sale in db.sales
 * - Bestandsreduzierung (Delta) in db.products
 * - OutboxEntry für Sync in db.outbox
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
    shopId: getShopId(),
    items,
    totalCents,
    paidCents,
    changeCents,
    donationCents,
    type: 'sale',
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
      shopId: getShopId(),
      createdAt: Date.now(),
      attempts: 0,
    });
  });

  return sale;
}

/**
 * Entnahme durch die Kirchengemeinde zum EK-Preis.
 * Bestand wird reduziert, totalCents = Summe der EK-Preise.
 */
export async function completeWithdrawal(items: CartItem[]): Promise<Sale> {
  // EK-Preise aus Dexie holen und als purchasePrice-Snapshot anhängen
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      const product = await db.products.get(item.productId) as Product | undefined;
      return {
        ...item,
        purchasePrice: product?.purchasePrice ?? 0,
      };
    })
  );

  const totalCents = enrichedItems.reduce((sum, i) => sum + (i.purchasePrice ?? 0) * i.quantity, 0);

  const sale: Sale = {
    id: crypto.randomUUID(),
    shopId: getShopId(),
    items: enrichedItems,
    totalCents,
    paidCents: 0,
    changeCents: 0,
    donationCents: 0,
    type: 'withdrawal',
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
      shopId: getShopId(),
      createdAt: Date.now(),
      attempts: 0,
    });
  });

  return sale;
}
