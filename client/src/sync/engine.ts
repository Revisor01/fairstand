import { db } from '../db/index.js';
import type { OutboxEntry } from '../db/index.js';

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
