import { useState } from 'react';
import { formatEur } from './utils.js';

// Quick-Buttons: hardcoded Standard [500, 1000, 2000, 5000] Cent (konfigurierbar in späteren Phasen)
const QUICK_AMOUNTS = [500, 1000, 2000, 5000]; // in Cent

interface NumPadProps {
  label: string;  // z.B. "Bezahlter Betrag"
  onConfirm: (cents: number) => void;
  onCancel: () => void;
}

export function NumPad({ label, onConfirm, onCancel }: NumPadProps) {
  const [buffer, setBuffer] = useState<string>('');

  // Konvertiert Buffer-String in Cent-Integer
  function bufferToCents(buf: string): number {
    if (!buf) return 0;
    const normalized = buf.replace(',', '.');
    const value = parseFloat(normalized);
    if (isNaN(value)) return 0;
    return Math.round(value * 100);
  }

  function handleDigit(digit: string) {
    // Dezimalkomma: max 2 Nachkommastellen
    if (digit === ',') {
      if (buffer.includes(',')) return; // Kein zweites Komma
      setBuffer(prev => prev === '' ? '0,' : prev + ',');
      return;
    }

    // Prüfe Nachkommastellen
    const commaIndex = buffer.indexOf(',');
    if (commaIndex !== -1) {
      const decimals = buffer.length - commaIndex - 1;
      if (decimals >= 2) return; // Max 2 Nachkommastellen
    }

    setBuffer(prev => {
      // Führende Null vermeiden (außer "0,")
      if (prev === '0' && digit !== ',') return digit;
      return prev + digit;
    });
  }

  function handleDelete() {
    setBuffer(prev => prev.slice(0, -1));
  }

  function handleConfirm() {
    const cents = bufferToCents(buffer);
    if (cents > 0) {
      onConfirm(cents);
    }
  }

  function handleQuick(cents: number) {
    onConfirm(cents);
  }

  const displayValue = buffer
    ? buffer + ' €'
    : '0,00 €';

  const currentCents = bufferToCents(buffer);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Label */}
      <div className="px-6 pt-6 pb-2">
        <p className="text-slate-500 text-sm font-medium">{label}</p>
      </div>

      {/* Anzeige */}
      <div className="px-6 pb-4">
        <div className="text-4xl font-bold text-slate-800 min-h-[3rem] flex items-center">
          {displayValue}
        </div>
        {currentCents > 0 && (
          <div className="text-slate-400 text-sm mt-1">
            = {formatEur(currentCents)}
          </div>
        )}
      </div>

      {/* Quick-Buttons */}
      <div className="flex gap-2 px-6 pb-4">
        {QUICK_AMOUNTS.map(amount => (
          <button
            key={amount}
            onPointerDown={() => handleQuick(amount)}
            className="
              flex-1 h-12 rounded-xl bg-sky-50 text-sky-700 font-semibold text-base
              border border-sky-200 active:bg-sky-100 transition-colors
            "
          >
            {formatEur(amount)}
          </button>
        ))}
      </div>

      {/* Numpad-Grid */}
      <div className="grid grid-cols-3 gap-2 px-6 pb-6 flex-1">
        {/* Zeile 1: 1 2 3 */}
        {['1', '2', '3'].map(d => (
          <NumKey key={d} label={d} onPress={() => handleDigit(d)} />
        ))}

        {/* Zeile 2: 4 5 6 */}
        {['4', '5', '6'].map(d => (
          <NumKey key={d} label={d} onPress={() => handleDigit(d)} />
        ))}

        {/* Zeile 3: 7 8 9 */}
        {['7', '8', '9'].map(d => (
          <NumKey key={d} label={d} onPress={() => handleDigit(d)} />
        ))}

        {/* Zeile 4: Löschen, 0, Komma */}
        <button
          onPointerDown={handleDelete}
          className="
            h-16 w-full rounded-lg text-2xl font-medium
            bg-rose-50 text-rose-600 border border-rose-100
            active:bg-rose-100 transition-colors
            flex items-center justify-center
          "
          aria-label="Letztes Zeichen löschen"
        >
          ⌫
        </button>

        <NumKey label="0" onPress={() => handleDigit('0')} />

        <NumKey label="," onPress={() => handleDigit(',')} />

        {/* Bestätigen — volle Breite */}
        <button
          onPointerDown={handleConfirm}
          disabled={currentCents <= 0}
          className="
            col-span-3 h-16 w-full rounded-lg text-2xl font-semibold
            bg-sky-400 text-white
            disabled:opacity-40 disabled:cursor-not-allowed
            active:bg-sky-500 transition-colors
            flex items-center justify-center gap-2
          "
          aria-label="Betrag bestätigen"
        >
          ✓ Bestätigen
        </button>

        {/* Abbrechen */}
        <button
          onPointerDown={onCancel}
          className="
            col-span-3 h-12 w-full rounded-lg text-base
            text-slate-500 hover:text-slate-700
            border border-slate-200 active:bg-slate-50 transition-colors
          "
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// --- Einzelne Numpad-Taste ---

interface NumKeyProps {
  label: string;
  onPress: () => void;
}

function NumKey({ label, onPress }: NumKeyProps) {
  return (
    <button
      onPointerDown={onPress}
      className="
        h-16 w-full rounded-lg text-2xl font-medium
        bg-white border border-sky-100 text-slate-800
        active:bg-sky-50 transition-colors
        flex items-center justify-center
      "
    >
      {label}
    </button>
  );
}
