import { getShopId } from '../../db/index.js';
import type { CartItem, Sale, Product } from '../../db/index.js';
import { authFetch } from '../auth/serverAuth.js';

/**
 * Schreibt einen Verkauf direkt an den Server.
 * Online-Only: kein Dexie, kein Outbox-Fallback.
 * Bei Server-Fehler: throw new Error — Nutzerin sieht Fehlermeldung.
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

  const res = await authFetch('/api/sync', {
    method: 'POST',
    body: JSON.stringify({
      entries: [{ operation: 'SALE_COMPLETE', payload: sale, shopId: getShopId(), createdAt: Date.now(), attempts: 0 }],
    }),
  });
  if (!res.ok) throw new Error('Verkauf konnte nicht gesendet werden. Bitte Internetverbindung prüfen.');
  return sale;
}

/**
 * Entnahme durch die Kirchengemeinde zum EK-Preis.
 * EK-Preise kommen aus den übergebenen products (TQ-Cache).
 * Online-Only: kein Dexie, kein Outbox-Fallback.
 * Bei Server-Fehler: throw new Error — Nutzerin sieht Fehlermeldung.
 */
export async function completeWithdrawal(
  items: CartItem[],
  products: Product[],
  reason?: string
): Promise<Sale> {
  // EK-Preise aus den übergebenen products anreichern
  const productMap = new Map(products.map(p => [p.id, p]));
  const enrichedItems = items.map(item => ({
    ...item,
    purchasePrice: productMap.get(item.productId)?.purchasePrice ?? 0,
  }));

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

  const res = await authFetch('/api/sync', {
    method: 'POST',
    body: JSON.stringify({
      entries: [{ operation: 'SALE_COMPLETE', payload: sale, shopId: getShopId(), createdAt: Date.now(), attempts: 0 }],
    }),
  });
  if (!res.ok) throw new Error('Entnahme konnte nicht gesendet werden. Bitte Internetverbindung prüfen.');
  return sale;
}
