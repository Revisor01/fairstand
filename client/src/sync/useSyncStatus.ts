// Immer 'synced': alle Operationen gehen direkt an den Server, Fehler zeigt die UI.

export type SyncStatus = 'synced' | 'pending' | 'failed';

export function useSyncStatus(): SyncStatus {
  return 'synced';
}

// Kein resetFailedEntries mehr nötig — kein Outbox-Pattern
export async function resetFailedEntries(): Promise<void> {
  // no-op
}
