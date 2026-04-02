import { Check, HandHeart, FileDown } from 'lucide-react';
import type { Sale } from '../../db/index.js';
import { formatEur } from './utils.js';
import { getAuthHeaders } from '../auth/serverAuth.js';

interface SaleSummaryProps {
  sale: Sale;
  onNext: () => void;
  onCorrect: () => void;
}

export function SaleSummary({ sale, onNext, onCorrect }: SaleSummaryProps) {
  const isWithdrawal = sale.type === 'withdrawal';
  const hasDonation = sale.donationCents > 0;

  async function handleDownloadReceipt(hideDonation: boolean) {
    const headers = await getAuthHeaders();
    const query = hideDonation ? '?hideDonation=true' : '';
    const res = await fetch(`/api/sales/${sale.id}/receipt-pdf${query}`, { headers });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beleg-${sale.id.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8 bg-sky-50">
      {/* Erfolgs-Icon */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
        isWithdrawal ? 'bg-amber-100' : 'bg-emerald-100'
      }`}>
        {isWithdrawal
          ? <HandHeart size={48} className="text-amber-500" strokeWidth={2} />
          : <Check size={48} className="text-emerald-500" strokeWidth={2.5} />
        }
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-1">
        {isWithdrawal ? 'Entnahme gebucht' : 'Verkauf abgeschlossen'}
      </h2>
      <p className="text-slate-500 text-sm mb-8">
        {new Date(sale.createdAt).toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
        })} Uhr
      </p>

      {/* Zusammenfassung */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6 mb-8 space-y-4">
        {isWithdrawal ? (
          <>
            <SummaryRow
              label="Warenwert (EK)"
              value={formatEur(sale.totalCents)}
              valueClass="text-amber-700 font-bold text-xl"
            />
            <div className="border-t border-sky-50" />
            <div className="text-xs text-slate-400">
              {sale.items.length} Artikel entnommen
              {sale.withdrawalReason && (
                <span className="block mt-1 text-amber-600">Grund: {sale.withdrawalReason}</span>
              )}
            </div>
          </>
        ) : (
          <>
            <SummaryRow
              label="Umsatz"
              value={formatEur(sale.totalCents)}
              valueClass="text-slate-800 font-bold text-xl"
            />
            <div className="border-t border-sky-50" />
            <SummaryRow
              label="Bezahlt"
              value={formatEur(sale.paidCents)}
            />
            <SummaryRow
              label="Wechselgeld"
              value={formatEur(sale.changeCents)}
            />
            <div className="border-t border-sky-50" />
            <SummaryRow
              label="Spende"
              value={formatEur(sale.donationCents)}
              valueClass="text-emerald-600 font-bold text-lg"
            />
          </>
        )}
      </div>

      {/* Buttons */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onPointerDown={onNext}
          className="
            w-full h-14 rounded-xl text-xl font-semibold
            bg-sky-400 text-slate-800
            active:bg-sky-500 transition-colors
          "
        >
          {isWithdrawal ? 'Fertig' : 'Nächster Kunde'}
        </button>

        {!isWithdrawal && (
          <div className={`flex gap-2 ${hasDonation ? '' : 'flex-col'}`}>
            <button
              onPointerDown={() => handleDownloadReceipt(false)}
              className="
                flex-1 h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2
                border-2 border-sky-200 text-sky-700
                active:bg-sky-50 transition-colors
              "
            >
              <FileDown size={18} />
              Beleg {hasDonation ? '(mit Spende)' : 'herunterladen'}
            </button>
            {hasDonation && (
              <button
                onPointerDown={() => handleDownloadReceipt(true)}
                className="
                  flex-1 h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2
                  border-2 border-sky-200 text-sky-700
                  active:bg-sky-50 transition-colors
                "
              >
                <FileDown size={18} />
                Beleg (ohne Spende)
              </button>
            )}
          </div>
        )}

        <button
          onPointerDown={onCorrect}
          className="
            w-full h-12 rounded-xl text-base font-medium
            border-2 border-rose-200 text-rose-600
            active:bg-rose-50 transition-colors
          "
        >
          Korrigieren
        </button>
      </div>
    </div>
  );
}

// --- Hilfskomponente ---

function SummaryRow({
  label,
  value,
  valueClass = 'text-slate-700 font-semibold',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
