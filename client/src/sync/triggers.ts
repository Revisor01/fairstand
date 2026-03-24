import type { QueryClient } from '@tanstack/react-query';
import { flushOutbox } from './engine.js';

export function registerSyncTriggers(queryClient?: QueryClient): void {
  // Sofortiger Flush beim App-Start wenn bereits online (Pitfall 3 aus RESEARCH.md)
  if (navigator.onLine) {
    void flushOutbox(queryClient);
  }

  // Trigger 1: Netz-Reconnect
  window.addEventListener('online', () => {
    void flushOutbox(queryClient);
  });

  // Trigger 2: Zurueckkehren in die App (iOS: online-Event fehlt oft nach Hintergrund)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      void flushOutbox(queryClient);
    }
  });

  // Trigger 3: Periodischer Retry alle 30 Sekunden wenn online (SYN-01)
  setInterval(() => {
    if (navigator.onLine) void flushOutbox(queryClient);
  }, 30_000);
}
