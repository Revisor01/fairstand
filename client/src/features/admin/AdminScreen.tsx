import { useState, useEffect } from 'react';
import { Package, BarChart3, Upload, Tags, Settings, Store, ClipboardList } from 'lucide-react';
import { ProductList } from './products/ProductList.js';
import { DailyReport } from './reports/DailyReport.js';
import { MonthlyReport } from './reports/MonthlyReport.js';
import { InventurTab } from './reports/InventurTab.js';
import { SettingsForm } from './settings/SettingsForm.js';
import { CategoryManager } from './settings/CategoryManager.js';
import { ImportScreen } from './import/ImportScreen.js';
import { ShopsManager } from './shops/ShopsManager.js';
import { useLowStockCount } from '../../hooks/useLowStockCount.js';
import { getStoredSession } from '../auth/serverAuth.js';

type AdminTab = 'products' | 'reports' | 'inventur' | 'settings' | 'import' | 'categories' | 'shops';

interface AdminScreenProps {
  onSwitchToPOS: () => void;
}

const tabs: { key: AdminTab; label: string; icon: typeof Package }[] = [
  { key: 'products', label: 'Produkte', icon: Package },
  { key: 'reports', label: 'Berichte', icon: BarChart3 },
  { key: 'inventur', label: 'Inventur', icon: ClipboardList },
  { key: 'import', label: 'Import', icon: Upload },
  { key: 'categories', label: 'Kategorien', icon: Tags },
  { key: 'settings', label: 'Einstellungen', icon: Settings },
];

export function AdminScreen({ onSwitchToPOS }: AdminScreenProps) {
  const [tab, setTab] = useState<AdminTab>('products');
  const lowStockCount = useLowStockCount();
  const [shopName, setShopName] = useState<string>('');
  const [isMaster, setIsMaster] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const currentYear = new Date().getFullYear();
  const [inventurYear, setInventurYear] = useState(currentYear);
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  useEffect(() => {
    getStoredSession().then(s => {
      if (s) {
        setShopName(s.shopName);
        setIsMaster(s.isMaster ?? false);
      }
    });
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const visibleTabs = isMaster
    ? [...tabs, { key: 'shops' as AdminTab, label: 'Shops', icon: Store }]
    : tabs;

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col">
      {/* Header */}
      <header className="bg-sky-600 text-white px-4 py-3 flex items-center gap-3">
        <button
          onPointerDown={onSwitchToPOS}
          className="bg-sky-500 active:bg-sky-700 text-white font-semibold px-4 py-2 rounded-lg text-sm min-h-[44px]"
        >
          Zur Kasse
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold leading-tight">Verwaltung</h1>
          {shopName && <p className="text-sky-200 text-xs leading-tight">{shopName}</p>}
        </div>
      </header>

      {/* Tab-Navigation */}
      <nav className="bg-white border-b border-sky-100 px-3 py-2">
        <div className="flex gap-1.5 overflow-x-auto">
          {visibleTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onPointerDown={() => setTab(key)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap min-h-[36px] transition-colors ${
                tab === key
                  ? 'bg-sky-400 text-white'
                  : 'bg-sky-100 text-sky-700 active:bg-sky-200'
              }`}
            >
              <Icon size={14} strokeWidth={2.5} />
              {label}
              {key === 'products' && lowStockCount > 0 && (
                <span className="inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4">
                  {lowStockCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab-Inhalt */}
      <main className="flex-1 p-4">
        {!isOnline ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <p className="text-slate-500 text-base font-medium">
              Internetverbindung erforderlich
            </p>
            <p className="text-slate-400 text-sm">
              Die Verwaltung ist nur online verfügbar.
            </p>
          </div>
        ) : (
          <>
            {tab === 'products' && <ProductList />}
            {tab === 'reports' && (
              <>
                <DailyReport />
                <hr className="my-6 border-slate-200" />
                <MonthlyReport />
              </>
            )}
            {tab === 'inventur' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-lg font-semibold text-sky-800">Inventur</h2>
                  <select
                    value={inventurYear}
                    onChange={e => setInventurYear(Number(e.target.value))}
                    className="h-11 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-sky-400 bg-white"
                  >
                    {yearOptions.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <InventurTab year={inventurYear} />
              </div>
            )}
            {tab === 'import' && <ImportScreen />}
            {tab === 'categories' && <CategoryManager />}
            {tab === 'settings' && <SettingsForm />}
            {tab === 'shops' && <ShopsManager />}
          </>
        )}
      </main>
    </div>
  );
}
