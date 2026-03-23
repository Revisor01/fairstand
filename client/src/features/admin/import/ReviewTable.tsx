export interface MatchedRow {
  lineNumber: number;
  quantity: number;
  articleNumber: string;
  name: string;
  purchasePriceCents: number;
  evpCents: number | null;
  vatRate: 7 | 19;
  parseWarning?: string;
  status: 'known' | 'new';
  existingProductId?: string;
  checked: boolean;
}

interface ReviewTableProps {
  rows: MatchedRow[];
  onRowChange: (index: number, updates: Partial<MatchedRow>) => void;
  onToggleCheck: (index: number) => void;
  onToggleAll: () => void;
}

function toEurStr(cents: number | null): string {
  if (cents === null) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

function toCentsFromStr(eurStr: string): number {
  const normalized = eurStr.replace(',', '.');
  const val = parseFloat(normalized);
  if (isNaN(val) || val < 0) return 0;
  return Math.round(val * 100);
}

export function ReviewTable({ rows, onRowChange, onToggleCheck, onToggleAll }: ReviewTableProps) {
  const allChecked = rows.length > 0 && rows.every(r => r.checked);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm border-collapse min-w-[700px]">
        <thead>
          <tr className="bg-sky-50">
            <th className="px-3 py-3 text-left">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={onToggleAll}
                className="w-5 h-5 accent-sky-500"
              />
            </th>
            <th className="px-3 py-3 text-right text-sky-700 font-semibold whitespace-nowrap">Nr.</th>
            <th className="px-3 py-3 text-right text-sky-700 font-semibold whitespace-nowrap">Menge</th>
            <th className="px-3 py-3 text-left text-sky-700 font-semibold whitespace-nowrap">Artikelnr.</th>
            <th className="px-3 py-3 text-left text-sky-700 font-semibold">Bezeichnung</th>
            <th className="px-3 py-3 text-right text-sky-700 font-semibold whitespace-nowrap">EK (€)</th>
            <th className="px-3 py-3 text-right text-sky-700 font-semibold whitespace-nowrap">EVP (€)</th>
            <th className="px-3 py-3 text-center text-sky-700 font-semibold whitespace-nowrap">MwSt</th>
            <th className="px-3 py-3 text-center text-sky-700 font-semibold whitespace-nowrap">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <>
              <tr
                key={`row-${index}`}
                className={`border-t border-slate-100 ${
                  row.status === 'known' ? 'bg-green-50' : 'bg-orange-50'
                }`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={row.checked}
                    onChange={() => onToggleCheck(index)}
                    className="w-5 h-5 accent-sky-500"
                  />
                </td>
                <td className="px-3 py-2 text-right text-slate-500 text-xs">{row.lineNumber}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={e => onRowChange(index, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="w-16 h-9 border border-slate-200 rounded-lg px-2 text-sm text-right focus:outline-none focus:border-sky-400 bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.articleNumber}
                    onChange={e => onRowChange(index, { articleNumber: e.target.value })}
                    className="w-24 h-9 border border-slate-200 rounded-lg px-2 text-sm focus:outline-none focus:border-sky-400 bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.name}
                    onChange={e => onRowChange(index, { name: e.target.value })}
                    className="w-full min-w-32 h-9 border border-slate-200 rounded-lg px-2 text-sm focus:outline-none focus:border-sky-400 bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={toEurStr(row.purchasePriceCents)}
                    onBlur={e => onRowChange(index, { purchasePriceCents: toCentsFromStr(e.target.value) })}
                    className="w-20 h-9 border border-slate-200 rounded-lg px-2 text-sm text-right focus:outline-none focus:border-sky-400 bg-white"
                    placeholder="0,00"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={toEurStr(row.evpCents)}
                    onBlur={e => {
                      const val = e.target.value.trim();
                      onRowChange(index, { evpCents: val ? toCentsFromStr(val) : null });
                    }}
                    className="w-20 h-9 border border-slate-200 rounded-lg px-2 text-sm text-right focus:outline-none focus:border-sky-400 bg-white"
                    placeholder="—"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <select
                    value={row.vatRate}
                    onChange={e => onRowChange(index, { vatRate: parseInt(e.target.value, 10) as 7 | 19 })}
                    className="h-9 border border-slate-200 rounded-lg px-1 text-sm focus:outline-none focus:border-sky-400 bg-white"
                  >
                    <option value="7">7 %</option>
                    <option value="19">19 %</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-center">
                  {row.status === 'known' ? (
                    <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap">
                      Bekannt
                    </span>
                  ) : (
                    <span className="inline-block bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap">
                      Neu
                    </span>
                  )}
                </td>
              </tr>
              {row.parseWarning && (
                <tr key={`warning-${index}`} className="bg-amber-50">
                  <td colSpan={9} className="px-4 py-2 text-amber-700 text-xs">
                    Hinweis: {row.parseWarning}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
