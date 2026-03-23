import { useRef } from 'react';
import type { CartItem } from '../../db/index.js';
import { formatEur } from './utils.js';

interface CartPanelProps {
  isOpen: boolean;
  items: CartItem[];
  total: number;
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

export function CartPanel({
  isOpen,
  items,
  total,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartPanelProps) {
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
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-lg hover:bg-sky-50"
            aria-label="Warenkorb schließen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemoveItem}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-sky-100 bg-white shrink-0">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-600 font-medium">Gesamt</span>
            <span className="text-slate-800 text-xl font-bold">{formatEur(total)}</span>
          </div>
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
          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
          aria-label="Entfernen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
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
