import { useEffect, useState } from 'react';
import { useAuth } from './features/auth/useAuth.js';
import { PinScreen } from './features/auth/PinScreen.jsx';
import { POSScreen } from './features/pos/POSScreen.js';
import { AdminScreen } from './features/admin/AdminScreen.js';
import { useLowStockCount } from './hooks/useLowStockCount.js';
import { downloadProducts } from './sync/engine.js';

// Separate Komponente damit useLowStockCount immer korrekt aufgerufen wird
function UnlockedApp({ onLock }: { onLock: () => void }) {
  const [activeView, setActiveView] = useState<'pos' | 'admin'>('pos');
  const lowStockCount = useLowStockCount();

  // Beim ersten Rendern nach Login: Produkte vom Server laden wenn online
  useEffect(() => {
    if (navigator.onLine) {
      downloadProducts().catch(() => {});
    }
  }, []); // Nur beim Mount — nicht bei jedem Re-Render

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

export default function App() {
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
