import { useState, useEffect } from 'react';
import type { Product } from '../../../db/index.js';
import { getShopId } from '../../../db/index.js';
import { formatEur } from '../../pos/utils.js';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { authFetch } from '../../auth/serverAuth.js';

interface ProductStatsProps {
  product: Product;
  onClose: () => void;
}

interface StatsData {
  productId: string;
  period_months: number;
  since_ts: number;
  sale_count: number;
  total_qty: number;
  revenue_cents: number;
  first_sale_at: number | null;
  last_sale_at: number | null;
  withdrawal_count: number;
  withdrawal_qty: number;
  withdrawal_ek_cents: number;
}

interface PriceHistoryEntry {
  id: string;
  productId: string;
  field: string;      // 'purchase_price' oder 'sale_price'
  oldValue: number;   // Cents
  newValue: number;   // Cents
  changedAt: number;  // Timestamp ms
}

export function ProductStats({ product, onClose }: ProductStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(3);
  const [statsTab, setStatsTab] = useState<'stats' | 'price-history'>('stats');
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!navigator.onLine) {
      setLoading(false);
      setError('offline');
      return;
    }
    setLoading(true);
    setError(null);
    authFetch(`/api/reports/product/${product.id}/stats?shopId=${getShopId()}&months=${months}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: StatsData) => setStats(data))
      .catch(() => setError('fetch_failed'))
      .finally(() => setLoading(false));
  }, [product.id, months]);

  useEffect(() => {
    if (statsTab !== 'price-history') return;
    if (!navigator.onLine) {
      setPriceHistory([]);
      return;
    }
    setLoadingHistory(true);
    authFetch(`/api/products/${product.id}/price-history`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: PriceHistoryEntry[]) => setPriceHistory(data))
      .catch(() => setPriceHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [product.id, statsTab]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-sky-800">{product.name}</h2>
          <p className="text-sm text-slate-500">Art.-Nr. {product.articleNumber} · {product.categories.join(', ')}</p>
        </div>
        <button
          onPointerDown={onClose}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded-lg h-11 text-sm transition-colors"
        >
          Zurück
        </button>
      </div>

      {/* Zeitraum-Auswahl (nur im Stats-Tab relevant) */}
      {statsTab === 'stats' && (
        <div className="flex gap-2">
          {[1, 3, 6, 12].map(m => (
            <button
              key={m}
              onPointerDown={() => setMonths(m)}
              className={`px-4 py-2 rounded-full text-sm font-medium h-11 transition-colors ${
                months === m
                  ? 'bg-sky-500 text-white'
                  : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
              }`}
            >
              {m === 1 ? '1 Monat' : `${m} Monate`}
            </button>
          ))}
        </div>
      )}

      {/* Tab-Auswahl: Statistiken vs. Preis-History */}
      <div className="flex border-b border-sky-100">
        {([
          { key: 'stats', label: 'Statistiken' },
          { key: 'price-history', label: 'Preis-History' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onPointerDown={() => setStatsTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              statsTab === tab.key
                ? 'border-sky-500 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats-Tab Inhalt */}
      {statsTab === 'stats' && (
        <>
          {loading && (
            <div className="text-center py-12 text-slate-500">Laden...</div>
          )}

          {error === 'offline' && (
            <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-xl text-sm">
              Statistik ist nur mit Internetverbindung verfügbar.
            </div>
          )}

          {error === 'fetch_failed' && (
            <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl text-sm">
              Statistik konnte nicht geladen werden.
            </div>
          )}

          {!loading && !error && stats && (
            <>
              {/* Kennzahlen — Verkäufe */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
                  <span className="text-3xl font-bold text-slate-800">{stats.total_qty}</span>
                  <span className="text-xs text-slate-500 text-center">Stück verkauft</span>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl font-bold text-sky-600">{formatEur(stats.revenue_cents)}</span>
                  <span className="text-xs text-slate-500 text-center">Umsatz</span>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
                  <span className="text-3xl font-bold text-slate-800">{stats.sale_count}</span>
                  <span className="text-xs text-slate-500 text-center">Transaktionen</span>
                </div>
              </div>

              {/* Kennzahlen — Entnahmen (nur wenn vorhanden) */}
              {stats.withdrawal_qty > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-amber-50 rounded-xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
                    <span className="text-3xl font-bold text-amber-700">{stats.withdrawal_qty}</span>
                    <span className="text-xs text-amber-600 text-center">Stück entnommen</span>
                  </div>
                  <div className="bg-amber-50 rounded-xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl font-bold text-amber-700">{formatEur(stats.withdrawal_ek_cents)}</span>
                    <span className="text-xs text-amber-600 text-center">Warenwert (EK)</span>
                  </div>
                  <div className="bg-amber-50 rounded-xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
                    <span className="text-3xl font-bold text-amber-700">{stats.withdrawal_count}</span>
                    <span className="text-xs text-amber-600 text-center">Entnahmen</span>
                  </div>
                </div>
              )}

              {/* Zeitraum-Info */}
              <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-slate-600">
                <p>Zeitraum: letzte {stats.period_months} Monate (ab {format(new Date(stats.since_ts), 'd. MMM yyyy', { locale: de })})</p>
                {stats.last_sale_at && (
                  <p className="mt-1">Letzter Verkauf: {format(new Date(stats.last_sale_at), 'd. MMM yyyy, HH:mm', { locale: de })} Uhr</p>
                )}
                {stats.withdrawal_qty > 0 && (
                  <p className="mt-1 text-amber-600">Gesamt bewegt: {stats.total_qty + stats.withdrawal_qty} Stück (Verkauf + Entnahme)</p>
                )}
                {stats.total_qty === 0 && (
                  <p className="mt-2 text-slate-400">In diesem Zeitraum keine Verkäufe.</p>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Preis-History-Tab Inhalt */}
      {statsTab === 'price-history' && (
        <div className="flex flex-col gap-3">
          {loadingHistory && (
            <div className="text-center py-8 text-slate-500 text-sm">Laden...</div>
          )}
          {!loadingHistory && !navigator.onLine && (
            <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-xl text-sm">
              Preis-History ist nur mit Internetverbindung verfügbar.
            </div>
          )}
          {!loadingHistory && navigator.onLine && priceHistory.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-slate-500 text-sm">
              Keine Preisänderungen vorhanden.
            </div>
          )}
          {!loadingHistory && priceHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-sky-50">
                    <th className="text-left px-4 py-3 text-sky-700 font-medium">Datum</th>
                    <th className="text-left px-4 py-3 text-sky-700 font-medium">Feld</th>
                    <th className="text-right px-4 py-3 text-sky-700 font-medium">Alter Preis</th>
                    <th className="text-right px-4 py-3 text-sky-700 font-medium">Neuer Preis</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.map(entry => (
                    <tr key={entry.id} className="border-t border-slate-100 hover:bg-sky-50/50">
                      <td className="px-4 py-3 text-slate-700">
                        {format(new Date(entry.changedAt), 'd. MMM yyyy', { locale: de })}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {entry.field === 'purchase_price' ? 'EK' : 'VK'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {formatEur(entry.oldValue)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {formatEur(entry.newValue)}
                        {entry.newValue > entry.oldValue
                          ? <span className="text-rose-500 ml-1 text-xs">↑</span>
                          : entry.newValue < entry.oldValue
                          ? <span className="text-emerald-500 ml-1 text-xs">↓</span>
                          : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
