import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Product } from '../../../db/index.js';
import { useAdjustStock } from '../../../hooks/api/useProducts.js';

interface StockAdjustModalProps {
  product: Product;
  onClose: () => void;
}

export function StockAdjustModal({ product, onClose }: StockAdjustModalProps) {
  const [delta, setDelta] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [overridePurchasePrice, setOverridePurchasePrice] = useState(false);
  const [purchasePriceInput, setPurchasePriceInput] = useState<string>(
    (product.purchasePrice / 100).toFixed(2)
  );

  const adjustStock = useAdjustStock();

  const parsedDelta = parseInt(delta, 10);
  const isValidDelta = !isNaN(parsedDelta) && parsedDelta !== 0;
  const isPositiveDelta = parsedDelta > 0;
  const newStock = isValidDelta ? product.stock + parsedDelta : product.stock;

  async function handleSave() {
    setError(null);

    if (!isValidDelta) {
      setError('Bitte eine Anzahl eingeben (positiv = Zugang, negativ = Abgang).');
      return;
    }

    let purchasePriceCents: number | undefined;
    if (isPositiveDelta && overridePurchasePrice) {
      const parsed = parseFloat(purchasePriceInput);
      if (isNaN(parsed) || parsed <= 0) {
        setError('Bitte einen gültigen EK-Preis eingeben (größer als 0).');
        return;
      }
      purchasePriceCents = Math.round(parsed * 100);
    }

    setSaving(true);
    try {
      await adjustStock.mutateAsync({
        productId: product.id,
        delta: parsedDelta,
        reason: reason.trim() || undefined,
        purchasePriceCents,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-sky-800">Bestand anpassen</h2>
        <button
          onPointerDown={onClose}
          className="text-slate-500 active:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors"
          aria-label="Abbrechen"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-4">
        {/* Produktinfo */}
        <div className="pb-3 border-b border-slate-100">
          <p className="font-semibold text-slate-800">{product.name}</p>
          <p className="text-sm text-slate-500">Art.-Nr. {product.articleNumber}</p>
          <p className="text-sm font-medium text-slate-700 mt-1">
            Aktueller Bestand: <span className="text-sky-700 font-bold">{product.stock}</span>
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">
            Änderung (+ Zugang, - Abgang)
          </label>
          <input
            type="number"
            step="1"
            value={delta}
            onChange={e => setDelta(e.target.value)}
            className="h-12 text-lg border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-sky-400"
            placeholder="z.B. +10 oder -3"
          />
        </div>

        {/* Vorschau neuer Bestand */}
        {isValidDelta && (
          <div className={`rounded-lg px-4 py-2 text-sm font-medium ${
            newStock < 0
              ? 'bg-rose-50 text-rose-700'
              : 'bg-sky-50 text-sky-700'
          }`}>
            Neuer Bestand: {newStock}
            {newStock < 0 && ' (Achtung: negativer Bestand)'}
          </div>
        )}

        {isPositiveDelta && (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={overridePurchasePrice}
                onChange={e => setOverridePurchasePrice(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-sky-600"
              />
              <span className="text-sm font-medium text-slate-600">Preis anpassen</span>
            </label>
            {overridePurchasePrice && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-600">
                  EK-Preis (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePriceInput}
                  onChange={e => setPurchasePriceInput(e.target.value)}
                  className="h-12 text-lg border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-sky-400"
                  placeholder="z.B. 1.49"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">
            Grund (optional, empfohlen)
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="h-12 text-lg border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-sky-400"
            placeholder="z.B. Lieferung, Schwund, Inventur"
          />
        </div>
      </div>

      <button
        onPointerDown={handleSave}
        disabled={saving || !isValidDelta}
        className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-semibold px-4 py-3 rounded-xl h-14 text-lg transition-colors"
      >
        {saving ? 'Speichern...' : 'Bestand anpassen'}
      </button>
    </div>
  );
}
