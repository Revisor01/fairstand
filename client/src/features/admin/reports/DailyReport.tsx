import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getShopId } from '../../../db/index.js';
import { formatEur } from '../../pos/utils.js';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { de } from 'date-fns/locale';

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DailyReport() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dayStart = useMemo(() => startOfDay(selectedDate).getTime(), [selectedDate]);
  const dayEnd = useMemo(() => endOfDay(selectedDate).getTime(), [selectedDate]);

  const sales = useLiveQuery(
    () =>
      db.sales
        .where('createdAt')
        .between(dayStart, dayEnd)
        .filter(s => s.shopId === getShopId())
        .toArray(),
    [dayStart, dayEnd],
    []
  );

  const stats = useMemo(() => {
    if (!sales) return { count: 0, totalCents: 0, donationCents: 0 };
    return {
      count: sales.length,
      totalCents: sales.reduce((sum, s) => sum + s.totalCents, 0),
      donationCents: sales.reduce((sum, s) => sum + s.donationCents, 0),
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
        <h2 className="text-lg font-semibold text-sky-800">Tagesuebersicht</h2>
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
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
          <span className="text-3xl font-bold text-slate-800">{stats.count}</span>
          <span className="text-xs text-slate-500 text-center">Verkaeufe</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
          <span className="text-2xl font-bold text-sky-600">{formatEur(stats.totalCents)}</span>
          <span className="text-xs text-slate-500 text-center">Gesamtumsatz</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center justify-center gap-1">
          <span className="text-2xl font-bold text-green-600">{formatEur(stats.donationCents)}</span>
          <span className="text-xs text-slate-500 text-center">Spenden</span>
        </div>
      </div>

      {/* Einzelne Verkaeufe */}
      {sales && sales.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sky-50 border-b border-sky-100">
                <th className="text-left px-4 py-3 text-sky-700 font-semibold">Uhrzeit</th>
                <th className="text-right px-4 py-3 text-sky-700 font-semibold">Summe</th>
                <th className="text-right px-4 py-3 text-sky-700 font-semibold">Spende</th>
              </tr>
            </thead>
            <tbody>
              {sales
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map(sale => (
                  <tr key={sale.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 text-slate-600">
                      {format(new Date(sale.createdAt), 'HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatEur(sale.totalCents)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">
                      {sale.donationCents > 0 ? formatEur(sale.donationCents) : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl shadow-sm">
          Keine Verkaeufe an diesem Tag.
        </div>
      )}
    </div>
  );
}
