import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Sale } from '../../../db/index.js';
import { formatEur } from '../../pos/utils.js';

interface SaleDetailModalProps {
  sale: Sale;
  onClose: () => void;
}

export function SaleDetailModal({ sale, onClose }: SaleDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4"
      onPointerDown={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">
              Verkauf {format(new Date(sale.createdAt), 'HH:mm', { locale: de })} Uhr
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {format(new Date(sale.createdAt), 'EEEE, d. MMMM yyyy', { locale: de })}
            </p>
          </div>
          <button
            onPointerDown={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {/* Artikel-Liste */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sky-50 border-b border-sky-100">
                <th className="text-left px-5 py-3 text-sky-700 font-semibold">Artikel</th>
                <th className="text-right px-4 py-3 text-sky-700 font-semibold">Menge</th>
                <th className="text-right px-5 py-3 text-sky-700 font-semibold">Preis</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 text-slate-800">{item.name}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{item.quantity}×</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-800">
                    {formatEur(item.salePrice * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer: Summen */}
        <div className="border-t border-slate-100 px-5 py-4 flex flex-col gap-1">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Gesamt</span>
            <span className="font-semibold text-slate-800">{formatEur(sale.totalCents)}</span>
          </div>
          {sale.donationCents > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>davon Spende</span>
              <span className="font-semibold">{formatEur(sale.donationCents)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
