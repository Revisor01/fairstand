import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { getShopId } from '../../../db/index.js';
import type { Sale } from '../../../db/index.js';
import { getAuthHeaders } from '../../auth/serverAuth.js';
import { formatEur } from '../../pos/utils.js';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { SaleDetailModal } from './SaleDetailModal.js';

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DailyReport() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const dayStart = useMemo(() => startOfDay(selectedDate).getTime(), [selectedDate]);
  const dayEnd = useMemo(() => endOfDay(selectedDate).getTime(), [selectedDate]);

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ['sales', getShopId(), dayStart, dayEnd],
    queryFn: async () => {
      const shopId = getShopId();
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/sales?shopId=${shopId}&from=${dayStart}&to=${dayEnd}`,
        { headers }
      );
      if (!res.ok) throw new Error('Verkäufe konnten nicht geladen werden');
      const data = await res.json() as Record<string, unknown>[];
      // Server gibt snake_case zurück — mappen
      return data.map(s => ({
        id: s.id as string,
        shopId: (s.shop_id ?? s.shopId) as string,
        items: (s.items ?? []) as Sale['items'],
        totalCents: (s.total_cents ?? s.totalCents ?? 0) as number,
        paidCents: (s.paid_cents ?? s.paidCents ?? 0) as number,
        changeCents: (s.change_cents ?? s.changeCents ?? 0) as number,
        donationCents: (s.donation_cents ?? s.donationCents ?? 0) as number,
        type: (s.type ?? 'sale') as Sale['type'],
        withdrawalReason: (s.withdrawal_reason ?? s.withdrawalReason) as string | undefined,
        createdAt: (s.created_at ?? s.createdAt) as number,
        cancelledAt: (s.cancelled_at ?? s.cancelledAt) as number | undefined,
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

  function goToday() {
    setSelectedDate(new Date());
  }

  function goYesterday() {
    setSelectedDate(subDays(new Date(), 1));
  }

  const dateLabel = format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de });
  const isToday = toDateInputValue(selectedDate) === toDateInputValue(new Date());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-sky-800">Tagesübersicht</h2>
        <div className="flex items-center gap-2">
          <button
            onPointerDown={goToday}
            className={`px-4 py-2 rounded-lg text-sm font-medium h-11 transition-colors ${
              isToday
                ? 'bg-sky-500 text-white'
                : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
            }`}
          >
            Heute
          </button>
          <button
            onPointerDown={goYesterday}
            className="bg-sky-100 hover:bg-sky-200 text-sky-700 px-4 py-2 rounded-lg text-sm font-medium h-11 transition-colors"
          >
            Gestern
          </button>
          <input
            type="date"
            value={toDateInputValue(selectedDate)}
            onChange={e => {
              const d = new Date(e.target.value);
              if (!isNaN(d.getTime())) setSelectedDate(d);
            }}
            className="h-11 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-sky-400"
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
                <th className="text-left px-4 py-3 text-sky-700 font-semibold">Uhrzeit</th>
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
                      {format(new Date(sale.createdAt), 'HH:mm')}
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
          Keine Verkäufe an diesem Tag.
        </div>
      )}

      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onSaleChanged={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
}
