import { useLiveQuery } from 'dexie-react-hooks';
import { db, getShopId } from '../db/index.js';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export function useSyncStatus(): SyncStatus {
  const outbox = useLiveQuery(
    () => {
      try {
        return db.outbox.where('shopId').equals(getShopId()).toArray();
      } catch {
        return Promise.resolve([]);
      }
    },
    []
  );
  if (!outbox || outbox.length === 0) return 'synced';
  if (outbox.some(e => (e.attempts ?? 0) >= 5)) return 'failed';
  return 'pending';
}

// Alle failed Einträge zurücksetzen (attempts auf 0) damit nächster flushOutbox() sie nochmal versucht
export async function resetFailedEntries(): Promise<void> {
  try {
    const shopId = getShopId();
    const failed = await db.outbox
      .where('shopId')
      .equals(shopId)
      .filter(e => (e.attempts ?? 0) >= 5)
      .toArray();
    for (const entry of failed) {
      await db.outbox.update(entry.id!, { attempts: 0 });
    }
  } catch {
    // Kein Shop gesetzt — ignorieren
  }
}
