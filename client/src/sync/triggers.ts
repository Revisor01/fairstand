import { flushOutbox } from './engine.js';

export function registerSyncTriggers(): void {
  // Sofortiger Flush beim App-Start wenn bereits online (Pitfall 3 aus RESEARCH.md)
  if (navigator.onLine) {
    void flushOutbox();
  }

  // Trigger 1: Netz-Reconnect
  window.addEventListener('online', () => {
    void flushOutbox();
  });

  // Trigger 2: Zurueckkehren in die App (iOS: online-Event fehlt oft nach Hintergrund)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      void flushOutbox();
    }
  });
}
