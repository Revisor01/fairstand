import { useEffect } from 'react';
import { useAuth } from './features/auth/useAuth.js';
import { PinScreen } from './features/auth/PinScreen.jsx';
import { seedIfEmpty } from './db/seed.js';

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

  // state === 'unlocked' — Kassen-UI (kommt in Plan 01-03)
  return (
    <div className="min-h-screen bg-sky-50">
      <div className="p-4 bg-sky-400 text-white flex justify-between items-center">
        <h1 className="text-xl font-bold">Fairstand Kasse</h1>
        <button
          className="text-sm bg-sky-600 px-3 py-2 rounded min-h-[44px]"
          onPointerDown={() => lock()}
        >
          Sperren
        </button>
      </div>
      <p className="p-8 text-slate-600">Kassen-UI wird in Plan 01-03 implementiert.</p>
    </div>
  );
}
