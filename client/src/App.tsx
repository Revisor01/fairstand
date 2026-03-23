import { useEffect, useState } from 'react';
import { useAuth } from './features/auth/useAuth.js';
import { PinScreen } from './features/auth/PinScreen.jsx';
import { POSScreen } from './features/pos/POSScreen.js';
import { AdminScreen } from './features/admin/AdminScreen.js';
import { seedIfEmpty } from './db/seed.js';

export default function App() {
  const { state, unlock, setup, lock } = useAuth();
  const [activeView, setActiveView] = useState<'pos' | 'admin'>('pos');

  useEffect(() => {
    // OFF-02 / Pitfall 3: Storage-Persistenz sichern — verhindert Datenverlust bei Speicherdruck
    if (navigator.storage?.persist) {
      navigator.storage.persist().then(granted => {
        if (!granted) {
          console.warn('[Fairstand] Storage-Persistenz abgelehnt — Datenverlust bei Speicherdruck möglich');
        }
      });
    }
    // Seed-Daten beim ersten Start laden (prüft selbst ob bereits vorhanden)
    seedIfEmpty().catch(console.error);
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
      {activeView === 'pos' ? (
        <POSScreen onLock={lock} onSwitchToAdmin={() => setActiveView('admin')} />
      ) : (
        <AdminScreen onSwitchToPOS={() => setActiveView('pos')} />
      )}
    </div>
  );
}
