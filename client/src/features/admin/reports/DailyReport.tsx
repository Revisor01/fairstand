import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { getShopId } from '../../../db/index.js';
import type { Sale } from '../../../db/index.js';
import { authFetch } from '../../auth/serverAuth.js';
import { formatEur } from '../../pos/utils.js';
import { startOfDay, endOfDay, subDays, startOfMonth, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { SaleDetailModal } from './SaleDetailModal.js';

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DailyReport() {
  type RangeMode = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  const [rangeMode, setRangeMode] = useState<RangeMode>('today');
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const queryClient = useQueryClient();

  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    switch (rangeMode) {
      case 'today':
        return { rangeStart: startOfDay(now).getTime(), rangeEnd: endOfDay(now).getTime() };
      case 'yesterday': {
        const y = subDays(now, 1);
        return { rangeStart: startOfDay(y).getTime(), rangeEnd: endOfDay(y).getTime() };
      }
      case 'week':
        return { rangeStart: startOfDay(subDays(now, 6)).getTime(), rangeEnd: endOfDay(now).getTime() };
      case 'month':
        return { rangeStart: startOfMonth(now).getTime(), rangeEnd: endOfDay(now).getTime() };
      case 'custom':
        return { rangeStart: startOfDay(customDate).getTime(), rangeEnd: endOfDay(customDate).getTime() };
    }
  }, [rangeMode, customDate]);

  const isMultiDay = rangeMode === 'week' || rangeMode === 'month';

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ['sales', getShopId(), rangeStart, rangeEnd],
    queryFn: async () => {
      const shopId = getShopId();
      const res = await authFetch(
        `/api/sales?shopId=${shopId}&from=${rangeStart}&to=${rangeEnd}`
      );
      if (!res.ok) throw new Error('Verkäufe konnten nicht geladen werden');
      const data = await res.json() as Record<string, unknown>[];
      // Server gibt snake_case zurück — mappen
      return data.map(s => ({
        id: s.id as string,
        shopId: (s.shop_id ?? s.shopId) as string,
        items: (s.items ?? []) as Sale['items'],
        totalCents: Number(s.total_cents ?? s.totalCents ?? 0),
        paidCents: Number(s.paid_cents ?? s.paidCents ?? 0),
        changeCents: Number(s.change_cents ?? s.changeCents ?? 0),
        donationCents: Number(s.donation_cents ?? s.donationCents ?? 0),
        type: (s.type ?? 'sale') as Sale['type'],
        withdrawalReason: (s.withdrawal_reason ?? s.withdrawalReason) as string | undefined,
        createdAt: Number(s.created_at ?? s.createdAt ?? 0),
        cancelledAt: s.cancelled_at || s.cancelledAt ? Number(s.cancelled_at ?? s.cancelledAt) : undefined,
        returnedItems: (s.returned_items ?? s.returnedItems) as string[] | undefined,
      }));
    },
  });

  const stats = useMemo(() => {
    if (!sales) return { count: 0, totalCents: 0, donationCents: 0, withdrawalCents: 0 };
    const active = sales.filter(s => !s.cancelledAt);
    const regularSales = active.filter(s => s.type !== 'withdrawal');
    const withdrawals = active.filter(s => s.type === 'withdrawal');
    return {
      count: regularSales.length,
      totalCents: regularSales.reduce((sum, s) => sum + s.totalCents, 0),
      donationCents: regularSales.reduce((sum, s) => sum + s.donationCents, 0),
      withdrawalCents: withdrawals.reduce((sum, s) => sum + s.totalCents, 0),
    };
  }, [sales]);

  const dateLabel = useMemo(() => {
    const now = new Date();
    switch (rangeMode) {
      case 'today':
        return `Heute, ${format(now, 'd. MMMM yyyy', { locale: de })}`;
      case 'yesterday':
        return `Gestern, ${format(subDays(now, 1), 'd. MMMM yyyy', { locale: de })}`;
      case 'week':
        return 'Letzte 7 Tage';
      case 'month':
        return format(now, 'MMMM yyyy', { locale: de });
      case 'custom':
        return format(customDate, 'd. MMMM yyyy', { locale: de });
    }
  }, [rangeMode, customDate]);

  function formatSaleTime(createdAt: number): string {
    const d = new Date(createdAt);
    if (isMultiDay) {
      return format(d, 'dd.MM. HH:mm');
    }
    return format(d, 'HH:mm');
  }

  const btnClass = (mode: RangeMode) =>
    `px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
      rangeMode === mode
        ? 'bg-sky-500 text-white'
        : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
    }`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-sky-800">Tagesübersicht</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button onPointerDown={() => setRangeMode('today')} className={btnClass('today')}>
            Heute
          </button>
          <button onPointerDown={() => setRangeMode('yesterday')} className={btnClass('yesterday')}>
            Gestern
          </button>
          <button onPointerDown={() => setRangeMode('week')} className={btnClass('week')}>
            Woche
          </button>
          <button onPointerDown={() => setRangeMode('month')} className={btnClass('month')}>
            Dieser Monat
          </button>
          <input
            type="date"
            value={toDateInputValue(customDate)}
            onChange={e => {
              const d = new Date(e.target.value);
              if (!isNaN(d.getTime())) {
                setCustomDate(d);
                setRangeMode('custom');
              }
            }}
            className="min-h-[44px] border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-sky-400"
          />
        </div>
      </div>

      <p className="text-sm text-slate-500">{dateLabel}</p>

      {/* Kennzahlen-Kacheln */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
          <span className="text-3xl font-bold text-slate-800">{stats.count}</span>
          <span className="text-xs text-slate-500 text-center">Verkäufe</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
          <span className="text-2xl font-bold text-sky-600">{formatEur(stats.totalCents)}</span>
          <span className="text-xs text-slate-500 text-center">Umsatz</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
          <span className="text-2xl font-bold text-green-600">{formatEur(stats.donationCents)}</span>
          <span className="text-xs text-slate-500 text-center">Spenden</span>
        </div>
        {stats.withdrawalCents > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
            <span className="text-2xl font-bold text-amber-600">{formatEur(stats.withdrawalCents)}</span>
            <span className="text-xs text-slate-500 text-center">Entnahmen (EK)</span>
          </div>
        )}
      </div>

      {/* Einzelne Verkäufe */}
      {sales && sales.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sky-50 border-b border-sky-100">
                <th className="text-left px-4 py-3 text-sky-700 font-semibold">Datum</th>
                <th className="text-right px-4 py-3 text-sky-700 font-semibold">Summe</th>
                <th className="text-right px-4 py-3 text-sky-700 font-semibold">Spende</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map(sale => (
                  <tr
                    key={sale.id}
                    className={`border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
                      sale.cancelledAt
                        ? 'bg-red-50 hover:bg-red-100 active:bg-red-100 opacity-60'
                        : 'hover:bg-sky-50 active:bg-sky-100'
                    }`}
                    onPointerDown={() => setSelectedSale(sale)}
                  >
                    <td className={`px-4 py-3 ${sale.cancelledAt ? 'line-through text-red-400' : 'text-slate-600'}`}>
                      {formatSaleTime(sale.createdAt)}
                      {sale.cancelledAt && <span className="ml-1 text-xs font-medium text-red-500">Storno</span>}
                      {!sale.cancelledAt && sale.type !== 'withdrawal' && <span className="ml-1 text-xs font-medium text-sky-500">Verkauf</span>}
                      {sale.type === 'withdrawal' && (
                        <span className="ml-1 text-xs font-medium text-amber-600">
                          Entnahme{sale.withdrawalReason ? ` — ${sale.withdrawalReason}` : ''}
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${sale.cancelledAt ? 'line-through text-red-400' : 'text-slate-800'}`}>
                      {formatEur(sale.totalCents)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${sale.cancelledAt ? 'text-red-300' : 'text-green-600'}`}>
                      {sale.donationCents > 0 ? formatEur(sale.donationCents) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300"><ChevronRight size={18} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl shadow-sm">
          Keine Verkäufe im gewählten Zeitraum.
        </div>
      )}

      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onSaleChanged={() => {
            setSelectedSale(null);
            queryClient.invalidateQueries({ queryKey: ['sales'] });
          }}
        />
      )}
    </div>
  );
}
