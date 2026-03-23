import { useLowStockProducts } from '../../hooks/useLowStockCount.js';

export function LowStockBanner() {
  const lowStockProducts = useLowStockProducts();

  if (lowStockProducts.length === 0) return null;

  return (
    <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-amber-800 text-sm">
      <span className="font-medium">Mindestbestand unterschritten:</span>{' '}
      {lowStockProducts.map(p => `${p.name} (${p.stock})`).join(', ')}
    </div>
  );
}
