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
      <nav className="bg-white border-b border-sky-200 flex">
        <button
          onPointerDown={() => setTab('products')}
          className={`relative flex-1 py-4 text-sm font-semibold transition-colors ${
            tab === 'products'
              ? 'bg-sky-500 text-white'
              : 'text-sky-700 hover:bg-sky-50'
          }`}
        >
          Produkte
          {lowStockCount > 0 && (
            <span className="inline-flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 ml-1">
              {lowStockCount}
            </span>
          )}
        </button>
        <button
          onPointerDown={() => setTab('reports')}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${
            tab === 'reports'
              ? 'bg-sky-500 text-white'
              : 'text-sky-700 hover:bg-sky-50'
          }`}
        >
          Berichte
        </button>
        <button
          onPointerDown={() => setTab('import')}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${
            tab === 'import'
              ? 'bg-sky-500 text-white'
              : 'text-sky-700 hover:bg-sky-50'
          }`}
        >
          Import
        </button>
        <button
          onPointerDown={() => setTab('settings')}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${
            tab === 'settings'
              ? 'bg-sky-500 text-white'
              : 'text-sky-700 hover:bg-sky-50'
          }`}
        >
          Einstellungen
        </button>
      </nav>

      {/* Tab-Inhalt */}
      <main className="flex-1 p-4">
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
