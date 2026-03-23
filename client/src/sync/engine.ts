import { db, SHOP_ID } from '../db/index.js';
import type { OutboxEntry, Product } from '../db/index.js';

let flushing = false;

export async function flushOutbox(): Promise<void> {
  // Guard gegen parallele Ausfuehrung (Doppel-Trigger bei schnellem Reconnect)
  if (flushing) return;
  flushing = true;

  try {
    const pending = await db.outbox
      .where('createdAt')
      .aboveOrEqual(0)
      .filter((e: OutboxEntry) => (e.attempts ?? 0) < 5)
      .toArray();

    if (pending.length === 0) return;

    let res: Response;
    try {
      res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: pending }),
      });
    } catch {
      // Netzwerkfehler (z.B. DNS nicht erreichbar) — Attempts erhoehen
      for (const entry of pending) {
        await db.outbox.update(entry.id!, { attempts: (entry.attempts ?? 0) + 1 });
      }
      return;
    }

    if (!res.ok) {
      // Server-Fehler (5xx) — Attempts erhoehen, naechster Trigger retried
      for (const entry of pending) {
        await db.outbox.update(entry.id!, { attempts: (entry.attempts ?? 0) + 1 });
      }
      return;
    }

    // Erfolg: Outbox-Eintraege loeschen
    const ids = pending.map((e: OutboxEntry) => e.id!);
    await db.outbox.bulkDelete(ids);

    // Sale.syncedAt setzen fuer alle SALE_COMPLETE-Eintraege
    const saleEntries = pending.filter((e: OutboxEntry) => e.operation === 'SALE_COMPLETE');
    for (const entry of saleEntries) {
      const payload = entry.payload as { id?: string };
      if (payload?.id) {
        await db.sales.update(payload.id, { syncedAt: Date.now() });
      }
    }
  } finally {
    flushing = false;
  }
}

// --- Download-Sync: Server → Client ---

interface ServerProduct {
  id: string;
  shop_id: string;
  article_number: string;
  name: string;
  category: string;
  purchase_price: number;
  sale_price: number;
  vat_rate: number;
  stock: number;
  min_stock: number;
  active: boolean | number; // SQLite boolean kann 0/1 sein
  updated_at: number;
}

export async function downloadProducts(): Promise<number> {
  const res = await fetch(`/api/products?shopId=${SHOP_ID}`);
  if (!res.ok) throw new Error(`Download fehlgeschlagen: ${res.status}`);
  const serverProducts: ServerProduct[] = await res.json();

  let upserted = 0;
  for (const sp of serverProducts) {
    const mapped: Product = {
      id: sp.id,
      shopId: sp.shop_id,
      articleNumber: sp.article_number,
      name: sp.name,
      category: sp.category,
      purchasePrice: sp.purchase_price,
      salePrice: sp.sale_price,
      vatRate: sp.vat_rate,
      stock: sp.stock,
      minStock: sp.min_stock,
      active: Boolean(sp.active),
      updatedAt: sp.updated_at,
    };

    // LWW: Nur ueberschreiben wenn Server-Daten neuer
    const existing = await db.products.get(mapped.id);
    if (!existing || mapped.updatedAt > existing.updatedAt) {
      await db.products.put(mapped);
      upserted++;
    }
  }
  return upserted;
}

// Download-Sync bei App-Start wenn online
if (typeof window !== 'undefined' && navigator.onLine) {
  downloadProducts().catch(() => {});
}
