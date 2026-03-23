import { useState } from 'react';

interface PinScreenProps {
  mode: 'setup' | 'unlock';
  onSetup: (pin: string) => Promise<void>;
  onUnlock: (pin: string) => Promise<boolean>;
}

export function PinScreen({ mode, onSetup, onUnlock }: PinScreenProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPin = isConfirming ? confirmPin : pin;
  const setCurrentPin = isConfirming ? setConfirmPin : setPin;

  const handleDigit = (digit: string) => {
    if (currentPin.length >= 6) return;
    setError(null);
    setCurrentPin(prev => prev + digit);
  };

  const handleDelete = () => {
    setError(null);
    setCurrentPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (currentPin.length !== 6) return; // PIN muss genau 6 Ziffern haben (pin.length === 6)

    if (mode === 'setup') {
      if (!isConfirming) {
        // Erste Eingabe — jetzt Bestätigung anfordern
        setIsConfirming(true);
        return;
      }
      // Bestätigung prüfen
      if (pin !== confirmPin) {
        setError('PINs stimmen nicht überein. Bitte erneut versuchen.');
        setPin('');
        setConfirmPin('');
        setIsConfirming(false);
        return;
      }
      await onSetup(pin);
    } else {
      // Unlock-Modus
      const ok = await onUnlock(currentPin);
      if (!ok) {
        setError('Falscher PIN. Bitte erneut versuchen.');
        setPin('');
      }
    }
  };

  const title =
    mode === 'setup'
      ? isConfirming
        ? 'PIN bestätigen'
        : 'PIN einrichten'
      : 'PIN eingeben';

  const subtitle =
    mode === 'setup'
      ? isConfirming
        ? 'Gib deinen neuen PIN zur Bestätigung noch einmal ein.'
        : 'Wähle einen 6-stelligen PIN für die Kasse.'
      : 'Gib deinen PIN ein, um die Kasse zu entsperren.';

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-sky-700 mb-2">Fairstand Kasse</h1>
          <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>

        {/* PIN-Anzeige: 6 Punkte */}
        <div className="flex justify-center gap-3 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < currentPin.length
                  ? 'bg-sky-400 border-sky-400'
                  : 'bg-transparent border-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Fehlermeldung */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6 text-center">
            {error}
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
            <button
              key={digit}
              onPointerDown={() => handleDigit(digit)}
              className="h-14 w-full bg-white border border-sky-200 text-slate-700 text-xl font-semibold rounded-xl shadow-sm active:bg-sky-100 hover:bg-sky-50 transition-colors"
            >
              {digit}
            </button>
          ))}

          {/* Löschen */}
          <button
            onPointerDown={handleDelete}
            className="h-14 w-full bg-white border border-sky-200 text-slate-500 text-sm font-medium rounded-xl shadow-sm active:bg-sky-100 hover:bg-sky-50 transition-colors"
          >
            &#9003;
          </button>

          {/* 0 */}
          <button
            onPointerDown={() => handleDigit('0')}
            className="h-14 w-full bg-white border border-sky-200 text-slate-700 text-xl font-semibold rounded-xl shadow-sm active:bg-sky-100 hover:bg-sky-50 transition-colors"
          >
            0
          </button>

          {/* Bestätigen */}
          <button
            onPointerDown={handleSubmit}
            disabled={currentPin.length !== 6}
            className="h-14 w-full bg-sky-400 text-white text-sm font-bold rounded-xl shadow-sm active:bg-sky-500 hover:bg-sky-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
