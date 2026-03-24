// Online-Only: kein Outbox-Pattern mehr — alle Operationen gehen direkt an den Server.
// Sync-Status ist immer 'synced' (Fehler werden als Fehlermeldungen im UI angezeigt).

export type SyncStatus = 'synced' | 'pending' | 'failed';

export function useSyncStatus(): SyncStatus {
  return 'synced';
}

// Kein resetFailedEntries mehr nötig — kein Outbox-Pattern
export async function resetFailedEntries(): Promise<void> {
  // no-op
}
