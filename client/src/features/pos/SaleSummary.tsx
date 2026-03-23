import type { Sale } from '../../db/index.js';
import { formatEur } from './utils.js';

interface SaleSummaryProps {
  sale: Sale;
  onNext: () => void;
  onCorrect: () => void;
}

export function SaleSummary({ sale, onNext, onCorrect }: SaleSummaryProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8 bg-sky-50">
      {/* Erfolgs-Icon */}
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-emerald-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-1">Verkauf abgeschlossen</h2>
      <p className="text-slate-500 text-sm mb-8">
        {new Date(sale.createdAt).toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
        })} Uhr
      </p>

      {/* Zusammenfassung */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6 mb-8 space-y-4">
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
          Nächster Kunde
        </button>

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
