import { useState } from 'react';
import { NumPad } from './NumPad.js';
import { formatEur } from './utils.js';

interface PaymentFlowProps {
  totalCents: number;
  onComplete: (paidCents: number, changeCents: number) => void;
  onCancel: () => void;
}

type PaymentStep = 'paid' | 'change';

export function PaymentFlow({ totalCents, onComplete, onCancel }: PaymentFlowProps) {
  const [step, setStep] = useState<PaymentStep>('paid');
  const [paidCents, setPaidCents] = useState<number>(0);
  const [changeCents, setChangeCents] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const difference = paidCents - totalCents; // paidCents - Gesamtpreis
  const donationCents = difference - changeCents;

  function handlePaidConfirm(cents: number) {
    if (cents < totalCents) {
      setError(`Bezahlter Betrag zu gering. Mindestens ${formatEur(totalCents)} nötig.`);
      return;
    }
    setError(null);
    setPaidCents(cents);
    setChangeCents(0);
    setStep('change');
  }

  function handleChangeConfirm(cents: number) {
    const maxChange = paidCents - totalCents;
    const safeChange = Math.min(cents, maxChange);
    setChangeCents(safeChange);
  }

  function handleComplete() {
    onComplete(paidCents, changeCents);
  }

  if (step === 'paid') {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-slate-800">Bezahlung</h2>
          <p className="text-slate-500 mt-1">
            Gesamtpreis: <span className="font-semibold text-slate-700">{formatEur(totalCents)}</span>
          </p>
          {error && (
            <div className="mt-2 p-3 bg-rose-50 text-rose-600 rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex-1">
          <NumPad
            label="Bezahlter Betrag"
            onConfirm={handlePaidConfirm}
            onCancel={onCancel}
          />
        </div>
      </div>
    );
  }

  // step === 'change'
  return (
    <div className="flex flex-col h-full">
      {/* Info-Bereich */}
      <div className="px-6 pt-6 pb-4 bg-sky-50 border-b border-sky-100">
        <h2 className="text-xl font-bold text-slate-800 mb-3">Wechselgeld</h2>

        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Gesamtpreis" value={formatEur(totalCents)} />
          <InfoRow label="Bezahlt" value={formatEur(paidCents)} />
          <InfoRow label="Differenz" value={formatEur(difference)} />
          <InfoRow label="Wechselgeld" value={formatEur(changeCents)} />
        </div>

        {/* Spende — live berechnet */}
        <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-emerald-700 text-sm font-medium">Spende</p>
          <p className="text-emerald-600 text-2xl font-bold">{formatEur(Math.max(0, donationCents))}</p>
        </div>
      </div>

      {/* Wechselgeld-Eingabe */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-4">
          <p className="text-slate-500 text-sm mb-3">
            Wechselgeld eingeben (max. {formatEur(difference)})
          </p>

          {/* Schnell-Buttons für Wechselgeld */}
          <div className="flex flex-wrap gap-2 mb-4">
            <ChangeButton
              label="Kein Wechselgeld"
              onPress={() => setChangeCents(0)}
              active={changeCents === 0}
            />
            <ChangeButton
              label="Alles zurück"
              onPress={() => setChangeCents(difference)}
              active={changeCents === difference}
            />
          </div>

          {/* Wechselgeld-Numpad */}
          <NumPad
            label={`Wechselgeld (max. ${formatEur(difference)})`}
            onConfirm={handleChangeConfirm}
            onCancel={() => {
              setStep('paid');
              setPaidCents(0);
            }}
          />
        </div>
      </div>

      {/* Abschließen-Button */}
      <div className="px-6 pb-6 pt-2 bg-white border-t border-sky-100 shrink-0">
        <button
          onPointerDown={handleComplete}
          className="
            w-full h-14 rounded-xl text-xl font-semibold
            bg-sky-400 text-slate-800
            active:bg-sky-500 transition-colors
          "
        >
          Abschließen
        </button>
      </div>
    </div>
  );
}

// --- Hilfskomponenten ---

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl px-3 py-2">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className="text-slate-800 font-semibold">{value}</p>
    </div>
  );
}

function ChangeButton({
  label,
  onPress,
  active,
}: {
  label: string;
  onPress: () => void;
  active: boolean;
}) {
  return (
    <button
      onPointerDown={onPress}
      className={`
        px-4 py-2 rounded-full text-sm font-medium min-h-[44px] transition-colors
        ${active
          ? 'bg-sky-400 text-white'
          : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
        }
      `}
    >
      {label}
    </button>
  );
}
