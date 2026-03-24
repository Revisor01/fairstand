import { useState, useEffect } from 'react';
import type { Product } from '../../../db/index.js';
import { getShopId } from '../../../db/index.js';
import { formatEur } from '../../pos/utils.js';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getAuthHeaders } from '../../auth/serverAuth.js';

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
}

export function ProductStats({ product, onClose }: ProductStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(3);

  useEffect(() => {
    if (!navigator.onLine) {
      setLoading(false);
      setError('offline');
      return;
    }
    setLoading(true);
    setError(null);
    getAuthHeaders().then(headers =>
      fetch(`/api/reports/product/${product.id}/stats?shopId=${getShopId()}&months=${months}`, { headers })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then((data: StatsData) => setStats(data))
        .catch(() => setError('fetch_failed'))
        .finally(() => setLoading(false))
    );
  }, [product.id, months]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-sky-800">{product.name}</h2>
          <p className="text-sm text-slate-500">Art.-Nr. {product.articleNumber} · {product.category}</p>
        </div>
        <button
          onPointerDown={onClose}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded-lg h-11 text-sm transition-colors"
        >
          Zurück
        </button>
      </div>

      {/* Zeitraum-Auswahl */}
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

      {/* Inhalt */}
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
          {/* Kennzahlen */}
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

          {/* Zeitraum-Info */}
          <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-slate-600">
            <p>Zeitraum: letzte {stats.period_months} Monate (ab {format(new Date(stats.since_ts), 'd. MMM yyyy', { locale: de })})</p>
            {stats.last_sale_at && (
              <p className="mt-1">Letzter Verkauf: {format(new Date(stats.last_sale_at), 'd. MMM yyyy, HH:mm', { locale: de })} Uhr</p>
            )}
            {stats.total_qty === 0 && (
              <p className="mt-2 text-slate-400">In diesem Zeitraum keine Verkäufe.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
