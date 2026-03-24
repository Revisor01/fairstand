import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAuth } from './features/auth/useAuth.js';
import { PinScreen } from './features/auth/PinScreen.jsx';
import { POSScreen } from './features/pos/POSScreen.js';
import { AdminScreen } from './features/admin/AdminScreen.js';
import { useLowStockCount } from './hooks/useLowStockCount.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { registerSyncTriggers } from './sync/triggers.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Separate Komponente damit useLowStockCount immer korrekt aufgerufen wird
function UnlockedApp({ onLock }: { onLock: () => void }) {
  const [activeView, setActiveView] = useState<'pos' | 'admin'>('pos');
  const lowStockCount = useLowStockCount();
  const queryClient = useQueryClient();
  useWebSocket();

  // Sync-Triggers mit QueryClient registrieren für Post-Flush-Invalidation
  useEffect(() => {
    registerSyncTriggers(queryClient);
  }, [queryClient]);

  if (activeView === 'admin') {
    return <AdminScreen onSwitchToPOS={() => setActiveView('pos')} />;
  }

  return (
    <POSScreen
      onLock={onLock}
      onSwitchToAdmin={() => setActiveView('admin')}
      lowStockCount={lowStockCount}
    />
  );
}

function AppInner() {
  const { state, unlock, setup, lock } = useAuth();

  useEffect(() => {
    // OFF-02 / Pitfall 3: Storage-Persistenz sichern — verhindert Datenverlust bei Speicherdruck
    if (navigator.storage?.persist) {
      navigator.storage.persist().then(granted => {
        if (!granted) {
          console.warn('[Fairstand] Storage-Persistenz abgelehnt — Datenverlust bei Speicherdruck möglich');
        }
      });
    }
    // seedIfEmpty() entfernt — Produkte kommen per Server-Download nach Login
  }, []);

  if (state === 'checking') {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <div className="text-sky-500 text-lg">Laden...</div>
      </div>
    );
  }

  if (state === 'setup') {
    return <PinScreen mode="setup" onSetup={setup} onUnlock={unlock} />;
  }

  if (state === 'locked') {
    return <PinScreen mode="unlock" onSetup={setup} onUnlock={unlock} />;
  }

  // state === 'unlocked' — vollständige Kassen-UI
  return (
    <div className="min-h-screen bg-sky-50">
      <UnlockedApp onLock={lock} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
