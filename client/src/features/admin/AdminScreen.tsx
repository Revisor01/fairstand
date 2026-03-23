import { useState } from 'react';
import { ProductList } from './products/ProductList.js';
import { DailyReport } from './reports/DailyReport.js';
import { useLowStockCount } from '../../hooks/useLowStockCount.js';

type AdminTab = 'products' | 'reports' | 'settings';

interface AdminScreenProps {
  onSwitchToPOS: () => void;
}

export function AdminScreen({ onSwitchToPOS }: AdminScreenProps) {
  const [tab, setTab] = useState<AdminTab>('products');
  const lowStockCount = useLowStockCount();

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
        <h1 className="text-xl font-bold">Verwaltung</h1>
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
        {tab === 'reports' && <DailyReport />}
        {tab === 'settings' && (
          <div className="text-sky-700 text-center mt-8">
            <p className="text-lg font-medium">Einstellungen</p>
            <p className="text-sm text-sky-500 mt-2">Wird in Plan 04 implementiert</p>
          </div>
        )}
      </main>
    </div>
  );
}
