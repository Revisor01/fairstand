import React, { useState, useEffect } from 'react';
import { authFetch } from '../../auth/serverAuth.js';
import { formatEur } from '../../pos/utils.js';

interface EkBreakdownEntry {
  ek_cents: number;
  qty: number;
  type: string; // 'sale' | 'withdrawal'
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
  ek_breakdown: EkBreakdownEntry[];
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
                <th className="text-right px-4 py-3 text-sky-700 font-medium">EK-Kosten</th>
              </tr>
            </thead>
            <tbody>
              {inventoryData.items.map(item => {
                const isExpanded = expandedProducts.has(item.id);
                const hasBreakdown = item.ek_breakdown.length > 1;
                const saleBreakdown = item.ek_breakdown.filter(e => e.type === 'sale');
                const withdrawalBreakdown = item.ek_breakdown.filter(e => e.type === 'withdrawal');
                return (
                  <React.Fragment key={item.id}>
                    <tr className="border-t border-slate-100 hover:bg-sky-50/50">
                      <td className="px-4 py-3 text-slate-800">
                        <div className="flex items-center gap-1">
                          {hasBreakdown && (
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
                          {hasBreakdown && (
                            <span className="text-xs text-slate-400 ml-1">
                              ({new Set(item.ek_breakdown.map(e => e.ek_cents)).size}×EK)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{item.current_stock}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{item.sold_qty || '—'}</td>
                      <td className="px-4 py-3 text-right text-amber-700">{item.withdrawn_qty || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatEur(item.revenue_cents)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatEur(item.cost_cents + item.withdrawal_cost_cents)}</td>
                    </tr>
                    {isExpanded && hasBreakdown && (
                      <>
                        {saleBreakdown.map((entry, idx) => (
                          <tr key={`s-${idx}`} className="bg-sky-50/70 border-t border-sky-100">
                            <td className="pl-10 pr-4 py-2 text-xs text-slate-500" colSpan={2}>
                              Verkauf · EK {formatEur(entry.ek_cents)}
                            </td>
                            <td className="px-4 py-2 text-right text-xs text-slate-500">{entry.qty}</td>
                            <td className="px-4 py-2" />
                            <td className="px-4 py-2 text-right text-xs text-slate-500">{formatEur(entry.qty * entry.ek_cents)}</td>
                            <td className="px-4 py-2" />
                          </tr>
                        ))}
                        {withdrawalBreakdown.map((entry, idx) => (
                          <tr key={`w-${idx}`} className="bg-amber-50/70 border-t border-amber-100">
                            <td className="pl-10 pr-4 py-2 text-xs text-amber-600" colSpan={2}>
                              Entnahme · EK {formatEur(entry.ek_cents)}
                            </td>
                            <td className="px-4 py-2" />
                            <td className="px-4 py-2 text-right text-xs text-amber-600">{entry.qty}</td>
                            <td className="px-4 py-2" />
                            <td className="px-4 py-2 text-right text-xs text-amber-600">{formatEur(entry.qty * entry.ek_cents)}</td>
                          </tr>
                        ))}
                      </>
                    )}
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
    </div>
  );
}
