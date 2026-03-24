import { useState, useEffect } from 'react';
import { ProductList } from './products/ProductList.js';
import { DailyReport } from './reports/DailyReport.js';
import { MonthlyReport } from './reports/MonthlyReport.js';
import { SettingsForm } from './settings/SettingsForm.js';
import { ImportScreen } from './import/ImportScreen.js';
import { useLowStockCount } from '../../hooks/useLowStockCount.js';
import { getStoredSession } from '../auth/serverAuth.js';

type AdminTab = 'products' | 'reports' | 'settings' | 'import';

interface AdminScreenProps {
  onSwitchToPOS: () => void;
}

export function AdminScreen({ onSwitchToPOS }: AdminScreenProps) {
  const [tab, setTab] = useState<AdminTab>('products');
  const lowStockCount = useLowStockCount();
  const [shopName, setShopName] = useState<string>('');

  useEffect(() => {
    getStoredSession().then(s => { if (s) setShopName(s.shopName); });
  }, []);

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col">
      {/* Header */}
      <header className="bg-sky-600 text-white px-4 py-3 flex items-center gap-3">
        <button
          onPointerDown={onSwitchToPOS}
          className="bg-sky-500 hover:bg-sky-400 active:bg-sky-700 text-white font-semibold px-4 py-2 rounded-lg text-sm"
        >
          Zur Kasse
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold leading-tight">Verwaltung</h1>
          {shopName && <p className="text-sky-200 text-xs leading-tight">{shopName}</p>}
        </div>
      </header>

      {/* Tab-Navigation */}
      <nav className="bg-white border-b border-sky-100 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onPointerDown={() => setTab('products')}
            className={`relative flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap min-h-[44px] transition-colors ${
              tab === 'products'
                ? 'bg-sky-400 text-white'
                : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
            }`}
          >
            Produkte
            {lowStockCount > 0 && (
              <span className="inline-flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5">
                {lowStockCount}
              </span>
            )}
          </button>
          <button
            onPointerDown={() => setTab('reports')}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap min-h-[44px] transition-colors ${
              tab === 'reports' ? 'bg-sky-400 text-white' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
            }`}
          >
            Berichte
          </button>
          <button
            onPointerDown={() => setTab('import')}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap min-h-[44px] transition-colors ${
              tab === 'import' ? 'bg-sky-400 text-white' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
            }`}
          >
            Import
          </button>
          <button
            onPointerDown={() => setTab('settings')}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap min-h-[44px] transition-colors ${
              tab === 'settings' ? 'bg-sky-400 text-white' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
            }`}
          >
            Einstellungen
          </button>
        </div>
      </nav>

      {/* Tab-Inhalt */}
      <main className="flex-1 p-6">
        {tab === 'products' && <ProductList />}
        {tab === 'reports' && (
          <>
            <DailyReport />
            <hr className="my-6 border-slate-200" />
            <MonthlyReport />
          </>
        )}
        {tab === 'import' && <ImportScreen />}
        {tab === 'settings' && <SettingsForm />}
      </main>
    </div>
  );
}
