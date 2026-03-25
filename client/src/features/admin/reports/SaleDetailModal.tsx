import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Sale } from '../../../db/index.js';
import { getShopId } from '../../../db/index.js';
import { authFetch } from '../../auth/serverAuth.js';
import { formatEur } from '../../pos/utils.js';

interface SaleDetailModalProps {
  sale: Sale;
  onClose: () => void;
  onSaleChanged?: () => void; // Callback nach Storno/Rückgabe — DailyReport refresht
}

export function SaleDetailModal({ sale, onClose, onSaleChanged }: SaleDetailModalProps) {
  async function handleCancelSale() {
    const confirmed = window.confirm('Verkauf stornieren? Alle Artikel werden zurückgebucht.');
    if (!confirmed) return;

    const cancelledAt = Date.now();

    const res = await authFetch('/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        entries: [{
          operation: 'SALE_CANCEL',
          payload: {
            saleId: sale.id,
            shopId: sale.shopId,
            items: sale.items,
            cancelledAt,
          },
          shopId: getShopId(),
          createdAt: Date.now(),
          attempts: 0,
        }],
      }),
    });

    if (!res.ok) {
      window.alert('Storno fehlgeschlagen. Bitte Internetverbindung prüfen.');
      return;
    }

    onSaleChanged?.();
    onClose();
  }

  async function handleReturnItem(productId: string, quantity: number) {
    const returnedAt = Date.now();

    const res = await authFetch('/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        entries: [{
          operation: 'ITEM_RETURN',
          payload: {
            saleId: sale.id,
            shopId: sale.shopId,
            productId,
            quantity,
            returnedAt,
          },
          shopId: getShopId(),
          createdAt: Date.now(),
          attempts: 0,
        }],
      }),
    });

    if (!res.ok) {
      window.alert('Rückgabe fehlgeschlagen. Bitte Internetverbindung prüfen.');
      return;
    }

    onSaleChanged?.();
    // Modal bleibt offen für weitere Rückgaben
  }

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

        {/* Storno-Banner */}
        {sale.cancelledAt && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
            <span className="text-red-600 font-semibold text-sm">Storniert</span>
            <span className="text-red-400 text-xs">
              {format(new Date(sale.cancelledAt), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
            </span>
          </div>
        )}

        {/* Artikel-Liste */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sky-50 border-b border-sky-100">
                <th className="text-left px-5 py-3 text-sky-700 font-semibold">Artikel</th>
                <th className="text-right px-4 py-3 text-sky-700 font-semibold">Menge</th>
                <th className="text-right px-5 py-3 text-sky-700 font-semibold">Preis</th>
                <th className="px-3 py-3 text-sky-700 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, idx) => {
                const isReturned = sale.returnedItems?.includes(item.productId) ?? false;
                return (
                  <tr
                    key={idx}
                    className={`border-b border-slate-50 last:border-0 ${isReturned ? 'opacity-50' : ''}`}
                  >
                    <td className={`px-5 py-3 ${isReturned ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {item.name}
                    </td>
                    <td className={`px-4 py-3 text-right ${isReturned ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                      {item.quantity}×
                    </td>
                    <td className={`px-5 py-3 text-right font-medium ${isReturned ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {formatEur(item.salePrice * item.quantity)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isReturned ? (
                        <span className="text-xs text-green-500 font-medium px-2">✓</span>
                      ) : (
                        <button
                          onPointerDown={() => handleReturnItem(item.productId, item.quantity)}
                          disabled={!!sale.cancelledAt}
                          className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed min-h-[32px] transition-colors"
                        >
                          Zurück
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer: Summen + Storno-Button */}
        <div className="border-t border-slate-100 px-5 py-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
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
          {!sale.cancelledAt && (
            <button
              onPointerDown={handleCancelSale}
              className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 active:bg-red-200 transition-colors min-h-[44px]"
            >
              Verkauf stornieren
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
