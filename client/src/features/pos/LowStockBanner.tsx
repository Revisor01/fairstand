import { AlertTriangle } from 'lucide-react';
import { useLowStockProducts } from '../../hooks/useLowStockCount.js';

export function LowStockBanner() {
  const lowStockProducts = useLowStockProducts();

  if (lowStockProducts.length === 0) return null;

  return (
    <div className="bg-amber-50 border-b-2 border-amber-400 px-4 py-3 text-amber-900 text-sm flex items-start gap-2">
      <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold">
          Mindestbestand unterschritten ({lowStockProducts.length}):
        </span>{' '}
        {lowStockProducts.map(p => `${p.name} (${p.stock})`).join(', ')}
      </div>
    </div>
  );
}
