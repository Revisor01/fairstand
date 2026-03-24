import { useRef, useState } from 'react';
import { X, Trash2, AlertCircle, HandHeart } from 'lucide-react';
import type { CartItem } from '../../db/index.js';
import { formatEur } from './utils.js';

interface CartPanelProps {
  isOpen: boolean;
  items: CartItem[];
  total: number;
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => Promise<{ blocked?: boolean; stock?: number }>;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  onWithdrawal?: () => void;
}

export function CartPanel({
  isOpen,
  items,
  total,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onWithdrawal,
}: CartPanelProps) {
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  async function handleUpdateQuantity(productId: string, quantity: number) {
    const result = await onUpdateQuantity(productId, quantity);
    if (result.blocked) {
      const item = items.find(i => i.productId === productId);
      setStockWarning(`"${item?.name}" — max. ${result.stock} auf Lager`);
      setTimeout(() => setStockWarning(null), 2500);
    } else {
      setStockWarning(null);
    }
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onPointerDown={onClose}
        />
      )}

      {/* Slide-In Panel */}
      <div
        className={`
          fixed inset-y-0 right-0 w-80 md:w-96 bg-white shadow-2xl z-50
          flex flex-col
          transform transition-transform duration-300
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sky-100 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">Warenkorb</h2>
          <button
            onPointerDown={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 active:text-slate-800 rounded-lg active:bg-sky-50"
            aria-label="Warenkorb schließen"
          >
            <X size={22} />
          </button>
        </div>

        {/* Stock-Warnung */}
        {stockWarning && (
          <div className="mx-4 mt-2 px-3 py-2 bg-amber-50 text-amber-700 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            {stockWarning}
          </div>
        )}

        {/* Artikel-Liste */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
              Warenkorb ist leer
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map(item => (
                <CartItemRow
                  key={item.productId}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={onRemoveItem}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-sky-100 bg-white shrink-0">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-600 font-medium">Gesamt</span>
            <span className="text-slate-800 text-xl font-bold">{formatEur(total)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onPointerDown={onCheckout}
              disabled={items.length === 0}
              className="
                w-full h-14 rounded-xl text-xl font-semibold
                bg-sky-400 text-slate-800
                disabled:opacity-40 disabled:cursor-not-allowed
                active:bg-sky-500 transition-colors
              "
            >
              Bezahlen
            </button>
            {onWithdrawal && (
              <button
                onPointerDown={onWithdrawal}
                disabled={items.length === 0}
                className="
                  w-full h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-2
                  border-2 border-amber-300 text-amber-700
                  disabled:opacity-40 disabled:cursor-not-allowed
                  active:bg-amber-50 transition-colors
                "
              >
                <HandHeart size={18} />
                Entnahme KG (zum EK)
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// --- CartItemRow ---

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <li className="flex flex-col gap-1 py-2 border-b border-sky-50">
      <div className="flex justify-between items-start">
        <span className="text-slate-800 text-sm font-medium leading-tight flex-1 pr-2">
          {item.name}
        </span>
        <button
          onPointerDown={() => onRemove(item.productId)}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-rose-500 active:bg-rose-50 rounded-lg shrink-0"
          aria-label="Entfernen"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        {/* Menge +/- mit Direkteingabe */}
        <div className="flex items-center gap-2">
          <button
            onPointerDown={() => onUpdateQuantity(item.productId, item.quantity - 1)}
            className="h-9 w-9 flex items-center justify-center bg-sky-100 rounded-full text-sky-700 font-bold text-lg active:bg-sky-200"
            aria-label="Menge verringern"
          >
            −
          </button>

          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={item.quantity}
            min={1}
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) onUpdateQuantity(item.productId, val);
            }}
            onPointerDown={() => inputRef.current?.focus()}
            className="w-12 text-center text-slate-800 font-semibold border border-sky-100 rounded-lg py-1 focus:outline-none focus:border-sky-400"
          />

          <button
            onPointerDown={() => onUpdateQuantity(item.productId, item.quantity + 1)}
            className="h-9 w-9 flex items-center justify-center bg-sky-100 rounded-full text-sky-700 font-bold text-lg active:bg-sky-200"
            aria-label="Menge erhöhen"
          >
            +
          </button>
        </div>

        <span className="text-sky-700 font-semibold text-sm">
          {formatEur(item.salePrice * item.quantity)}
        </span>
      </div>
    </li>
  );
}
