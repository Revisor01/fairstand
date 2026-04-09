import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useLowStockProducts } from '../../hooks/useLowStockCount.js';

export function StockAlertButton() {
  const products = useLowStockProducts();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sortierung: niedrigster relativer Bestand zuerst
  // (stock / minStock aufsteigend; 0 ganz oben)
  const sorted = [...products].sort((a, b) => {
    const ratioA = a.minStock > 0 ? a.stock / a.minStock : Infinity;
    const ratioB = b.minStock > 0 ? b.stock / b.minStock : Infinity;
    return ratioA - ratioB;
  });

  // Klick ausserhalb schliesst Popover
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Wenn keine Warnungen: Glocke ohne Badge, kein Klick-Handler noetig
  if (products.length === 0) {
    return (
      <div className="min-h-[44px] min-w-[44px] flex items-center justify-center opacity-40">
        <Bell size={22} />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onPointerDown={() => setOpen(prev => !prev)}
        className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl active:bg-sky-500 transition-colors"
        aria-label={`${products.length} Artikel unter Mindestbestand`}
      >
        <Bell size={22} />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {products.length}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
            <span className="text-sm font-semibold text-amber-800">
              Mindestbestand unterschritten
            </span>
          </div>
          <ul className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {sorted.map(p => (
              <li key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                <span className="text-sm text-slate-800 truncate">{p.name}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  <span className="font-semibold text-red-600">{p.stock}</span>
                  {' / min '}
                  {p.minStock}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
