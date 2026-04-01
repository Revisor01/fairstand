import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import type { Sale } from '../../../db/index.js';
import { getShopId } from '../../../db/index.js';
import { authFetch } from '../../auth/serverAuth.js';
import { formatEur } from '../../pos/utils.js';

interface SaleDetailModalProps {
  sale: Sale;
  onClose: () => void;
  onSaleChanged?: () => void; // Callback nach Storno/Rückgabe — DailyReport refresht
}

type ConfirmAction = 'cancel' | 'delete' | null;

export function SaleDetailModal({ sale, onClose, onSaleChanged }: SaleDetailModalProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function handleCancelSale() {
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
      setAlertMessage('Storno fehlgeschlagen. Bitte Internetverbindung prüfen.');
      return;
    }

    onSaleChanged?.();
    onClose();
  }

  async function handleDeleteSale() {
    const res = await authFetch(`/api/sales/${sale.id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      setAlertMessage('Löschen fehlgeschlagen. Bitte Internetverbindung prüfen.');
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
      setAlertMessage('Rückgabe fehlgeschlagen. Bitte Internetverbindung prüfen.');
      return;
    }

    onSaleChanged?.();
    // Modal bleibt offen für weitere Rückgaben
  }

  async function handleReceiptPdfDownload() {
    setDownloadingPdf(true);
    try {
      const res = await authFetch(`/api/sales/${sale.id}/receipt-pdf`);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `beleg-${sale.id.slice(0, 8).toUpperCase()}-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      alert('PDF-Download fehlgeschlagen. Bitte erneut versuchen.');
      console.error('Receipt PDF error:', err);
    } finally {
      setDownloadingPdf(false);
    }
  }

  function onConfirmAction() {
    if (confirmAction === 'cancel') {
      setConfirmAction(null);
      handleCancelSale();
    } else if (confirmAction === 'delete') {
      setConfirmAction(null);
      handleDeleteSale();
    }
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
                          Storno
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer: Summen + Buttons */}
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
          <div className="flex gap-2">
            {!sale.cancelledAt && (
              <button
                onPointerDown={() => setConfirmAction('cancel')}
                className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 active:bg-red-200 transition-colors min-h-[44px]"
              >
                Verkauf stornieren
              </button>
            )}
            <button
              onPointerDown={() => setConfirmAction('delete')}
              className="py-3 px-4 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 active:bg-red-800 transition-colors min-h-[44px] flex items-center gap-2"
            >
              <Trash2 size={16} />
              Löschen
            </button>
          </div>
          {!sale.cancelledAt && (
            <button
              onClick={handleReceiptPdfDownload}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingPdf ? (
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : <span>↓</span>}
              PDF-Beleg
            </button>
          )}
        </div>
      </div>

      {/* Bestätigungsmodal */}
      {confirmAction && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onPointerDown={() => setConfirmAction(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
            onPointerDown={e => e.stopPropagation()}
          >
            <h4 className="font-semibold text-slate-800 text-lg">
              {confirmAction === 'cancel' ? 'Verkauf stornieren?' : 'Verkauf endgültig löschen?'}
            </h4>
            <p className="text-sm text-slate-600">
              {confirmAction === 'cancel'
                ? 'Alle Artikel werden zurückgebucht. Diese Aktion kann nicht rückgängig gemacht werden.'
                : 'Der Verkauf wird unwiderruflich aus der Datenbank entfernt und alle Artikel zurückgebucht.'}
            </p>
            <div className="flex gap-3">
              <button
                onPointerDown={() => setConfirmAction(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 active:bg-slate-300 transition-colors min-h-[44px]"
              >
                Abbrechen
              </button>
              <button
                onPointerDown={onConfirmAction}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 active:bg-red-800 transition-colors min-h-[44px]"
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert-Modal (ersetzt window.alert) */}
      {alertMessage && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onPointerDown={() => setAlertMessage(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
            onPointerDown={e => e.stopPropagation()}
          >
            <p className="text-sm text-slate-700">{alertMessage}</p>
            <button
              onPointerDown={() => setAlertMessage(null)}
              className="w-full py-3 rounded-xl bg-sky-500 text-white font-medium text-sm hover:bg-sky-600 active:bg-sky-700 transition-colors min-h-[44px]"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
