import { useRef } from 'react';
import type { Product } from '../../db/index.js';
import { formatEur } from './utils.js';

// Reine Funktion für Pointer-Movement-Threshold-Logik.
// Exportiert für Unit-Tests (analog zu checkStockBeforeAdd-Muster).
// Threshold: strict < 8px in beide Richtungen.
export function shouldTriggerTap(
  start: { x: number; y: number },
  end: { x: number; y: number },
  stock: number
): boolean {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  return dx < 8 && dy < 8 && stock > 0;
}

interface ArticleCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function ArticleCard({ product, onAddToCart }: ArticleCardProps) {
  // useRef statt useState — kein Re-Render beim Pointer-Down (per D-UIX-01)
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.minStock > 0 && product.stock <= product.minStock;

  const cardClassName = [
    'bg-white shadow-sm rounded-xl min-h-[80px] p-4',
    'flex flex-col justify-between items-start',
    'transition-colors text-left',
    isOutOfStock
      ? 'opacity-50 cursor-not-allowed border-l-4 border-rose-400'
      : isLowStock
        ? 'border-l-4 border-amber-400 active:bg-amber-50'
        : 'active:bg-sky-50',
  ].join(' ');

  return (
    <button
      disabled={isOutOfStock}
      className={cardClassName}
      onPointerDown={(e) => {
        startPos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const start = startPos.current;
        startPos.current = null;
        if (start && shouldTriggerTap(start, { x: e.clientX, y: e.clientY }, product.stock)) {
          onAddToCart(product);
        }
      }}
      onPointerCancel={() => {
        // iOS übernimmt Scroll — Ghost-Tap verhindern
        startPos.current = null;
      }}
    >
      {product.imageUrl && (
        <div className="w-full h-20 -mx-4 -mt-4 mb-2 overflow-hidden rounded-t-xl">
          <img
            src={product.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <span className="text-slate-800 font-medium text-sm leading-tight line-clamp-3">
        {product.name}
      </span>
      <div className="flex items-baseline gap-2 mt-1 w-full justify-between">
        <span className="text-sky-700 font-semibold text-sm">
          {formatEur(product.salePrice)}
        </span>
        <span className="flex items-center gap-1">
          <span className={`text-xs leading-none ${
            product.stock === 0
              ? 'text-rose-500'
              : product.minStock > 0 && product.stock <= product.minStock
                ? 'text-amber-500'
                : 'text-emerald-500'
          }`}>●</span>
          <span className={`text-xs font-medium ${
            product.stock <= 0
              ? 'text-rose-500'
              : product.minStock > 0 && product.stock <= product.minStock
                ? 'text-amber-600'
                : 'text-slate-400'
          }`}>
            {product.stock <= 0
              ? 'Ausverkauft'
              : product.minStock > 0 && product.stock <= product.minStock
                ? `Noch ${product.stock}`
                : `${product.stock} Stk.`
            }
          </span>
        </span>
      </div>
    </button>
  );
}
