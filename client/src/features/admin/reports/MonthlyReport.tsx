import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getShopId } from '../../../db/index.js';
import { formatEur } from '../../pos/utils.js';
import { ReportChart } from './ReportChart.js';
import { authFetch } from '../../auth/serverAuth.js';

const monthNames = Array.from({ length: 12 }, (_, i) =>
  format(new Date(2026, i, 1), 'MMMM', { locale: de })
);

interface MonthlySummary {
  sale_count: number;
  total_cents: number;
  cost_cents: number;
  margin_cents: number;
  donation_cents: number;
  extra_donation_cents: number;
}

interface TopArticle {
  name: string;
  total_qty: number;
  sale_qty: number;
  withdrawal_qty: number;
  revenue_cents: number;
}

interface MonthlyResponse {
  summary: MonthlySummary;
  topArticles: TopArticle[];
}

interface YearlyMonth {
  month: number;
  sale_count: number;
  total_cents: number;
  cost_cents: number;
  margin_cents: number;
  donation_cents: number;
}

interface YearlyResponse {
  year: number;
  months: YearlyMonth[];
}

interface MonthData {
  month: string;
  umsatz: number;
  spenden: number;
}

export function MonthlyReport() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [monthlyData, setMonthlyData] = useState<MonthlyResponse | null>(null);
  const [yearlyData, setYearlyData] = useState<MonthData[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [loadingYearly, setLoadingYearly] = useState(false);

  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  useEffect(() => {
    if (!navigator.onLine) return;
    setLoadingMonthly(true);
    authFetch(`/api/reports/monthly?shopId=${getShopId()}&year=${year}&month=${month}`)
      .then(r => r.json())
      .then((data: MonthlyResponse) => setMonthlyData(data))
      .catch(() => setMonthlyData(null))
      .finally(() => setLoadingMonthly(false));
  }, [year, month]);

  useEffect(() => {
    if (!navigator.onLine) return;
    setLoadingYearly(true);
    authFetch(`/api/reports/yearly?shopId=${getShopId()}&year=${year}`)
      .then(r => r.json())
      .then((data: YearlyResponse) => {
        const chartData: MonthData[] = monthNames.map((name, i) => {
          const mData = data.months.find(m => m.month === i + 1);
          return {
            month: name.slice(0, 3),
            umsatz: mData?.total_cents ?? 0,
            spenden: mData?.donation_cents ?? 0,
          };
        });
        setYearlyData(chartData);
      })
      .catch(() => setYearlyData([]))
      .finally(() => setLoadingYearly(false));
  }, [year]);

  if (!navigator.onLine) {
    return (
      <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-500 mt-4">
        <p className="text-lg font-medium">Berichte sind nur online verfügbar</p>
        <p className="text-sm mt-1">Bitte stelle eine Internetverbindung her.</p>
      </div>
    );
  }

  const summary = monthlyData?.summary;
  const topArticles = monthlyData?.topArticles ?? [];

  return (
    <div className="flex flex-col gap-6 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-sky-800">Monats-/Jahresberichte</h2>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="h-11 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-sky-400 bg-white"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="h-11 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-sky-400 bg-white"
          >
            {monthNames.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Monats-Zusammenfassung */}
      {loadingMonthly ? (
        <p className="text-slate-500 text-sm">Laden...</p>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center gap-1">
              <span className="text-3xl font-bold text-slate-800">{summary.sale_count}</span>
              <span className="text-xs text-slate-500 text-center">Verkäufe</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center gap-1">
              <span className="text-xl font-bold text-sky-500">{formatEur(summary.total_cents)}</span>
              <span className="text-xs text-slate-500 text-center">Gesamtumsatz</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center gap-1">
              <span className="text-xl font-bold text-slate-500">{formatEur(summary.cost_cents)}</span>
              <span className="text-xs text-slate-500 text-center">EK-Kosten</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center gap-1">
              <span className="text-xl font-bold text-emerald-500">{formatEur(summary.margin_cents)}</span>
              <span className="text-xs text-slate-500 text-center">Marge</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center gap-1">
              <span className="text-xl font-bold text-green-500">{formatEur(summary.donation_cents)}</span>
              <span className="text-xs text-slate-500 text-center">Spenden</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center gap-1">
              <span className="text-xl font-bold text-amber-500">{formatEur(summary.extra_donation_cents)}</span>
              <span className="text-xs text-slate-500 text-center">Überzahlung</span>
            </div>
          </div>

          {/* Top-5-Artikel */}
          {topArticles.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <h3 className="text-sm font-semibold text-sky-700 px-4 py-3 border-b border-sky-50">
                Top 5 Artikel
              </h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-sky-50">
                    <th className="text-left px-4 py-3 text-sky-700 font-semibold">Artikel</th>
                    <th className="text-right px-4 py-3 text-sky-700 font-semibold">Gesamt</th>
                    <th className="text-right px-4 py-3 text-sky-700 font-semibold">Verkauf</th>
                    <th className="text-right px-4 py-3 text-sky-700 font-semibold">Entnahme</th>
                    <th className="text-right px-4 py-3 text-sky-700 font-semibold">Umsatz</th>
                  </tr>
                </thead>
                <tbody>
                  {topArticles.map((a, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      <td className="px-4 py-3 text-slate-700">{a.name}</td>
                      <td className="px-4 py-3 text-right text-slate-800 font-medium">{Number(a.total_qty)}</td>
                      <td className="px-4 py-3 text-right text-sky-600">{Number(a.sale_qty)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{Number(a.withdrawal_qty) > 0 ? Number(a.withdrawal_qty) : '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatEur(Number(a.revenue_cents))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p className="text-slate-500 text-sm">Keine Daten für diesen Monat.</p>
      )}

      {/* Jahresverlauf-Chart */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-sky-700 mb-4">Jahresverlauf {year}</h3>
        {loadingYearly ? (
          <p className="text-slate-500 text-sm">Laden...</p>
        ) : (
          <ReportChart data={yearlyData} />
        )}
      </div>
    </div>
  );
}
