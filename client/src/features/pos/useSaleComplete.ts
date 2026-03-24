import { db, getShopId } from '../../db/index.js';
import type { CartItem, Sale, Product } from '../../db/index.js';
import { getAuthHeaders } from '../auth/serverAuth.js';

/**
 * Schreibt einen Verkauf in Dexie und sendet ihn online direkt an den Server.
 * Online: direkt POST /api/sync, Sale.syncedAt setzen
 * Offline: OutboxEntry für späteren Sync erstellen
 *
 * Wichtig: db.outbox ist NICHT Teil der Dexie-Transaktion — verhindert IDB-Timeout
 * bei async fetch() innerhalb der Transaktion.
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

  // Sale + Stock-Delta immer in Dexie (Verlauf, Storno, Offline-Fallback)
  await db.transaction('rw', [db.sales, db.products], async () => {
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
  });

  if (navigator.onLine) {
    // Online: direkt an Server senden
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entries: [{
            operation: 'SALE_COMPLETE',
            payload: sale,
            shopId: getShopId(),
            createdAt: Date.now(),
            attempts: 0,
          }],
        }),
      });
      if (res.ok) {
        await db.sales.update(sale.id, { syncedAt: Date.now() });
      } else {
        // Server-Fehler → in Outbox für späteren Retry
        await db.outbox.add({
          operation: 'SALE_COMPLETE',
          payload: sale,
          shopId: getShopId(),
          createdAt: Date.now(),
          attempts: 0,
        });
      }
    } catch {
      // Netzwerkfehler → in Outbox für späteren Retry
      await db.outbox.add({
        operation: 'SALE_COMPLETE',
        payload: sale,
        shopId: getShopId(),
        createdAt: Date.now(),
        attempts: 0,
      });
    }
  } else {
    // Offline: in Outbox schreiben
    await db.outbox.add({
      operation: 'SALE_COMPLETE',
      payload: sale,
      shopId: getShopId(),
      createdAt: Date.now(),
      attempts: 0,
    });
  }

  return sale;
}

/**
 * Entnahme durch die Kirchengemeinde zum EK-Preis.
 * Bestand wird reduziert, totalCents = Summe der EK-Preise.
 * Online: direkt POST /api/sync
 * Offline: OutboxEntry für späteren Sync erstellen
 */
export async function completeWithdrawal(items: CartItem[], reason?: string): Promise<Sale> {
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
    withdrawalReason: reason?.trim() || undefined,
    createdAt: Date.now(),
  };

  // Sale + Stock-Delta immer in Dexie (Verlauf, Storno, Offline-Fallback)
  await db.transaction('rw', [db.sales, db.products], async () => {
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
  });

  if (navigator.onLine) {
    // Online: direkt an Server senden
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entries: [{
            operation: 'SALE_COMPLETE',
            payload: sale,
            shopId: getShopId(),
            createdAt: Date.now(),
            attempts: 0,
          }],
        }),
      });
      if (res.ok) {
        await db.sales.update(sale.id, { syncedAt: Date.now() });
      } else {
        // Server-Fehler → in Outbox für späteren Retry
        await db.outbox.add({
          operation: 'SALE_COMPLETE',
          payload: sale,
          shopId: getShopId(),
          createdAt: Date.now(),
          attempts: 0,
        });
      }
    } catch {
      // Netzwerkfehler → in Outbox für späteren Retry
      await db.outbox.add({
        operation: 'SALE_COMPLETE',
        payload: sale,
        shopId: getShopId(),
        createdAt: Date.now(),
        attempts: 0,
      });
    }
  } else {
    // Offline: in Outbox schreiben
    await db.outbox.add({
      operation: 'SALE_COMPLETE',
      payload: sale,
      shopId: getShopId(),
      createdAt: Date.now(),
      attempts: 0,
    });
  }

  return sale;
}
