import { useState } from 'react';
import { X, Delete } from 'lucide-react';
import type { CartItem } from '../../db/index.js';
import { formatEur } from './utils.js';

interface PaymentFlowProps {
  totalCents: number;
  items: CartItem[];
  onComplete: (paidCents: number, changeCents: number) => void;
  onCancel: () => void;
}

export function PaymentFlow({ totalCents, items, onComplete, onCancel }: PaymentFlowProps) {
  const [inputStr, setInputStr] = useState<string>('');
  const [changeCents, setChangeCents] = useState<number>(0);

  const parsed = parseFloat(inputStr.replace(',', '.'));
  const paidCents = isNaN(parsed) || inputStr === '' ? 0 : Math.round(parsed * 100);

  const difference = paidCents - totalCents;
  const donationCents = Math.max(0, difference - changeCents);

  const canComplete = paidCents >= totalCents;
  const hasInput = inputStr !== '';
  const tooLow = hasInput && paidCents > 0 && paidCents < totalCents;

  function handleNumpadInput(digit: string) {
    setInputStr(prev => {
      if (digit === ',' && prev.includes(',')) return prev;
      if (digit === '00' && prev === '') return prev;
      return prev + digit;
    });
    setChangeCents(0);
  }

  function handleBackspace() {
    setInputStr(prev => prev.slice(0, -1));
    setChangeCents(0);
  }

  function handleKeinWechselgeld() {
    setChangeCents(0);
  }

  function handleAllesZurueck() {
    setChangeCents(Math.max(0, difference));
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-sky-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6 space-y-5">

        {/* Kopfzeile */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Bezahlung</h2>
          <button
            onPointerDown={onCancel}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 active:bg-sky-100 transition-colors"
            aria-label="Bezahlung abbrechen"
          >
            <X size={22} />
          </button>
        </div>

        {/* Artikelliste */}
        <div className="max-h-40 overflow-y-auto space-y-1">
          {items.map((item, idx) => (
            <div key={`${item.productId}-${idx}`} className="flex justify-between items-center py-1">
              <span className="text-sm text-slate-700 flex-1 truncate pr-2">{item.name}</span>
              <span className="text-sm text-slate-500 shrink-0">
                {item.quantity} × {formatEur(item.salePrice)}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-sky-100" />

        {/* Gesamtsumme */}
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-sm">Gesamt</span>
          <span className="text-2xl font-bold text-slate-800">{formatEur(totalCents)}</span>
        </div>
        <div className="border-t border-sky-100" />

        {/* Bezahlt-Eingabe */}
        <div className="space-y-3">
          <label className="text-slate-500 text-sm block">Bezahlt</label>
          <input
            type="text"
            inputMode="decimal"
            readOnly
            value={inputStr}
            placeholder="0,00"
            className="w-full h-14 text-xl text-center border-2 border-sky-200 rounded-xl focus:border-sky-400 outline-none text-slate-800 font-semibold"
          />

          {/* Ziffernfeld */}
          <div className="grid grid-cols-3 gap-2">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(d => (
              <button
                key={d}
                onPointerDown={() => handleNumpadInput(d)}
                className="h-11 rounded-xl text-lg font-semibold text-slate-800 bg-sky-50 active:bg-sky-200 transition-colors"
              >
                {d}
              </button>
            ))}
            <button
              onPointerDown={() => handleNumpadInput('00')}
              className="h-11 rounded-xl text-lg font-semibold text-slate-800 bg-sky-50 active:bg-sky-200 transition-colors"
            >
              00
            </button>
            <button
              onPointerDown={() => handleNumpadInput('0')}
              className="h-11 rounded-xl text-lg font-semibold text-slate-800 bg-sky-50 active:bg-sky-200 transition-colors"
            >
              0
            </button>
            <button
              onPointerDown={() => handleNumpadInput(',')}
              className="h-11 rounded-xl text-lg font-semibold text-slate-800 bg-sky-50 active:bg-sky-200 transition-colors"
            >
              ,
            </button>
            {/* Backspace über die volle Breite */}
            <button
              onPointerDown={handleBackspace}
              className="col-span-3 h-11 rounded-xl text-slate-500 bg-slate-100 active:bg-slate-200 transition-colors flex items-center justify-center"
              aria-label="Letzte Ziffer löschen"
            >
              <Delete size={20} />
            </button>
          </div>
        </div>

        {/* Fehlerhinweis */}
        {tooLow && (
          <div className="bg-rose-50 text-rose-600 rounded-xl p-3 text-sm">
            Betrag zu gering. Mindestens {formatEur(totalCents)} nötig.
          </div>
        )}

        {/* Live-Ergebnis */}
        {canComplete && (
          <div className="space-y-3">
            {/* Schnellauswahl */}
            <div className="flex gap-2">
              <button
                onPointerDown={handleKeinWechselgeld}
                className={`flex-1 min-h-[44px] rounded-full text-sm font-medium transition-colors ${
                  changeCents === 0
                    ? 'bg-sky-400 text-white'
                    : 'bg-sky-100 text-sky-700 active:bg-sky-200'
                }`}
              >
                Kein Wechselgeld
              </button>
              <button
                onPointerDown={handleAllesZurueck}
                className={`flex-1 min-h-[44px] rounded-full text-sm font-medium transition-colors ${
                  changeCents === difference
                    ? 'bg-sky-400 text-white'
                    : 'bg-sky-100 text-sky-700 active:bg-sky-200'
                }`}
              >
                Alles zurück
              </button>
            </div>

            {/* Wechselgeld-Zeile */}
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Wechselgeld</span>
              <span className="text-slate-800 font-semibold">{formatEur(changeCents)}</span>
            </div>

            {/* Spende */}
            <div className="bg-emerald-50 rounded-xl p-3 flex justify-between items-center">
              <span className="text-emerald-700 text-sm font-medium">Spende</span>
              <span className="text-emerald-600 text-lg font-bold">{formatEur(donationCents)}</span>
            </div>
          </div>
        )}

        {/* Abschließen-Button */}
        <button
          onPointerDown={() => canComplete && onComplete(paidCents, changeCents)}
          disabled={!canComplete}
          className={`w-full h-14 rounded-xl text-xl font-semibold transition-colors ${
            canComplete
              ? 'bg-sky-400 text-slate-800 active:bg-sky-500'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          Abschließen
        </button>

      </div>
    </div>
  );
}
