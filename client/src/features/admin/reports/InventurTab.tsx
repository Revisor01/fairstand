import React, { useState, useEffect } from 'react';
import { authFetch } from '../../auth/serverAuth.js';
import { formatEur } from '../../pos/utils.js';

interface PricePeriod {
  ek_cents: number;
  vk_cents: number;
  from: number;
  to: number;
  sold_qty: number;
  withdrawn_qty: number;
  revenue_cents: number;
  cost_cents: number;
  withdrawal_cost_cents: number;
}

interface InventoryItem {
  id: string;
  article_number: string;
  name: string;
  current_stock: number;
  current_ek_cents: number;
  sold_qty: number;
  withdrawn_qty: number;
  revenue_cents: number;
  cost_cents: number;
  withdrawal_cost_cents: number;
  price_periods: PricePeriod[];
}

interface InventoryResponse {
  year: number;
  items: InventoryItem[];
  total_stock_value_cents: number;
}

interface InventurTabProps {
  year: number;
}

export function InventurTab({ year }: InventurTabProps) {
  const [inventoryData, setInventoryData] = useState<InventoryResponse | null>(null);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [downloadingInventurCsv, setDownloadingInventurCsv] = useState(false);
  const [downloadingInventurPdf, setDownloadingInventurPdf] = useState(false);

  useEffect(() => {
    if (!navigator.onLine) return;
    setLoadingInventory(true);
    setInventoryData(null);
    authFetch(`/api/reports/inventory?year=${year}`)
      .then(r => r.json())
      .then((data: InventoryResponse) => setInventoryData(data))
      .catch(() => setInventoryData(null))
      .finally(() => setLoadingInventory(false));
  }, [year]);

  async function handleInventurCsvDownload() {
    setDownloadingInventurCsv(true);
    try {
      const res = await authFetch(`/api/reports/inventory-csv?year=${year}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `inventur-${year}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      alert('CSV-Download fehlgeschlagen. Bitte erneut versuchen.');
      console.error('Inventur CSV error:', err);
    } finally {
      setDownloadingInventurCsv(false);
    }
  }

  async function handleInventurPdfDownload() {
    setDownloadingInventurPdf(true);
    try {
      const res = await authFetch(`/api/reports/inventory-pdf?year=${year}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `inventur-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      alert('PDF-Download fehlgeschlagen. Bitte erneut versuchen.');
      console.error('Inventur PDF error:', err);
    } finally {
      setDownloadingInventurPdf(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {loadingInventory && (
        <div className="text-center py-12 text-slate-500">Laden...</div>
      )}
      {!loadingInventory && !inventoryData && (
        <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-500">
          Keine Daten für {year}.
        </div>
      )}
      {!loadingInventory && inventoryData && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleInventurCsvDownload}
            disabled={downloadingInventurCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingInventurCsv ? (
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : <span>↓</span>}
            Inventur CSV
          </button>
          <button
            onClick={handleInventurPdfDownload}
            disabled={downloadingInventurPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingInventurPdf ? (
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : <span>↓</span>}
            Inventur PDF
          </button>
        </div>
      )}
      {!loadingInventory && inventoryData && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sky-50">
                <th className="text-left px-4 py-3 text-sky-700 font-medium">Artikel</th>
                <th className="text-right px-4 py-3 text-sky-700 font-medium">Bestand</th>
                <th className="text-right px-4 py-3 text-sky-700 font-medium">Verkauft</th>
                <th className="text-right px-4 py-3 text-sky-700 font-medium">Entnahme</th>
                <th className="text-right px-4 py-3 text-sky-700 font-medium">VK-Umsatz</th>
                <th className="text-right px-4 py-3 text-sky-700 font-medium">Entnahme (EK)</th>
                <th className="text-right px-4 py-3 text-sky-700 font-medium">EK-Kosten</th>
                <th className="text-right px-4 py-3 text-sky-700 font-medium">Bestandswert</th>
              </tr>
            </thead>
            <tbody>
              {inventoryData.items.map(item => {
                const isExpanded = expandedProducts.has(item.id);
                const hasPeriods = item.price_periods.length > 1;
                return (
                  <React.Fragment key={item.id}>
                    <tr className="border-t border-slate-100 hover:bg-sky-50/50">
                      <td className="px-4 py-3 text-slate-800">
                        <div className="flex items-center gap-1">
                          {hasPeriods && (
                            <button
                              onPointerDown={() => {
                                setExpandedProducts(prev => {
                                  const next = new Set(prev);
                                  if (isExpanded) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                });
                              }}
                              className="text-sky-500 text-xs w-4 shrink-0"
                              aria-label={isExpanded ? 'Zuklappen' : 'Aufklappen'}
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          )}
                          <span>{item.name}</span>
                          {hasPeriods && (
                            <span className="text-xs text-slate-400 ml-1">
                              ({item.price_periods.length} Preisperioden)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{item.current_stock}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{item.sold_qty || '—'}</td>
                      <td className="px-4 py-3 text-right text-amber-700">{item.withdrawn_qty || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{item.revenue_cents ? formatEur(item.revenue_cents) : '—'}</td>
                      <td className="px-4 py-3 text-right text-amber-700">{item.withdrawal_cost_cents ? formatEur(item.withdrawal_cost_cents) : '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{(item.cost_cents + item.withdrawal_cost_cents) ? formatEur(item.cost_cents + item.withdrawal_cost_cents) : '—'}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{formatEur(item.current_stock * item.current_ek_cents)}</td>
                    </tr>
                    {isExpanded && hasPeriods && item.price_periods.map((period, idx) => {
                      const periodYearEnd = new Date(year + 1, 0, 1).getTime();
                      const fromStr = new Date(period.from).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                      const toStr = period.to >= periodYearEnd
                        ? 'heute'
                        : new Date(period.to).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                      return (
                        <React.Fragment key={idx}>
                          <tr className="bg-slate-50 border-t border-slate-200">
                            <td className="pl-10 pr-4 py-2 text-xs text-slate-600 font-medium" colSpan={8}>
                              EK {formatEur(period.ek_cents)} / VK {formatEur(period.vk_cents)}
                              <span className="text-slate-400 ml-2">({fromStr}–{toStr})</span>
                            </td>
                          </tr>
                          {period.sold_qty > 0 && (
                            <tr className="bg-sky-50/50 border-t border-sky-100">
                              <td className="pl-14 pr-4 py-1.5 text-xs text-slate-500" colSpan={2}>Verkauf</td>
                              <td className="px-4 py-1.5 text-right text-xs text-slate-600">{period.sold_qty}</td>
                              <td className="px-4 py-1.5" />
                              <td className="px-4 py-1.5 text-right text-xs text-slate-600">{formatEur(period.revenue_cents)}</td>
                              <td className="px-4 py-1.5" />
                              <td className="px-4 py-1.5 text-right text-xs text-slate-500">{formatEur(period.cost_cents)}</td>
                            </tr>
                          )}
                          {period.withdrawn_qty > 0 && (
                            <tr className="bg-amber-50/50 border-t border-amber-100">
                              <td className="pl-14 pr-4 py-1.5 text-xs text-amber-600" colSpan={2}>Entnahme</td>
                              <td className="px-4 py-1.5" />
                              <td className="px-4 py-1.5 text-right text-xs text-amber-600">{period.withdrawn_qty}</td>
                              <td className="px-4 py-1.5" />
                              <td className="px-4 py-1.5 text-right text-xs text-amber-600">{formatEur(period.withdrawal_cost_cents)}</td>
                              <td className="px-4 py-1.5 text-right text-xs text-amber-600">{formatEur(period.withdrawal_cost_cents)}</td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {/* Summenzeile */}
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-800">Summe</td>
                <td className="px-4 py-3 text-right font-bold text-slate-700">
                  {inventoryData.items.reduce((s, i) => s + i.current_stock, 0)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-700">
                  {inventoryData.items.reduce((s, i) => s + i.sold_qty, 0)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-amber-700">
                  {inventoryData.items.reduce((s, i) => s + i.withdrawn_qty, 0)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">
                  {formatEur(inventoryData.items.reduce((s, i) => s + i.revenue_cents, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-amber-700">
                  {formatEur(inventoryData.items.reduce((s, i) => s + i.withdrawal_cost_cents, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-700">
                  {formatEur(inventoryData.items.reduce((s, i) => s + i.cost_cents + i.withdrawal_cost_cents, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700">
                  {formatEur(inventoryData.total_stock_value_cents)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
            * Bestandswert basiert auf aktuellem EK (Annäherung — kein FIFO-Verbrauch)
          </p>
        </div>
      )}
      {!loadingInventory && inventoryData && inventoryData.items.length > 0 && (() => {
        const totalRevenue = inventoryData.items.reduce((s, i) => s + i.revenue_cents, 0);
        const totalWithdrawalCost = inventoryData.items.reduce((s, i) => s + i.withdrawal_cost_cents, 0);
        const totalCost = inventoryData.items.reduce((s, i) => s + i.cost_cents + i.withdrawal_cost_cents, 0);
        const balance = totalRevenue + totalWithdrawalCost - totalCost;
        return (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
            <h3 className="text-base font-semibold text-slate-800">Bilanz {inventoryData.year}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Einnahmen aus Verkauf (VK)</span>
                <span className="font-medium text-slate-800">{formatEur(totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Einnahmen aus Entnahme (EK)</span>
                <span className="font-medium text-amber-700">{formatEur(totalWithdrawalCost)}</span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between">
                <span className="text-slate-600 font-medium">Gesamteinnahmen</span>
                <span className="font-bold text-slate-800">{formatEur(totalRevenue + totalWithdrawalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Gesamt EK-Kosten</span>
                <span className="font-medium text-slate-700">− {formatEur(totalCost)}</span>
              </div>
              <div className="border-t-2 border-slate-300 pt-2 flex justify-between">
                <span className="text-slate-800 font-bold">Marge</span>
                <span className={`font-bold text-lg ${balance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatEur(balance)}
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
