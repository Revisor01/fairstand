import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getShopId } from '../../db/index.js';
import type { Product } from '../../db/index.js';
import { formatEur } from './utils.js';

interface ArticleGridProps {
  onAddToCart: (product: Product) => void;
}

export function ArticleGrid({ onAddToCart }: ArticleGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Alle');

  // Reaktiv — aktualisiert sich bei Bestandsänderungen
  // useLiveQuery gibt Product[] | undefined zurück (undefined während des Ladens)
  const products = useLiveQuery(
    () =>
      db.products
        .where('shopId')
        // Sicherheitshinweis: getShopId() wirft wenn kein Shop gesetzt ist.
        // ArticleGrid wird nur gerendert wenn state === 'unlocked' (App.tsx),
        // also ist shopId hier garantiert gesetzt. Kein try-catch nötig.
        .equals(getShopId())
        .and(p => p.active === true)
        .toArray() as Promise<Product[]>,
    []
  );

  // Alphabetisch sortierte unique Kategorien aus den geladenen Produkten
  const categories = useMemo((): string[] => {
    if (!products) return [];
    const unique = [...new Set((products as Product[]).map((p: Product) => p.category))].sort();
    return ['Alle', ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (activeCategory === 'Alle') return products;
    return products.filter((p: Product) => p.category === activeCategory);
  }, [products, activeCategory]);

  if (!products) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Laden...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Kategorie-Tabs */}
      <div className="flex gap-1 overflow-x-auto px-4 pt-3 pb-2 bg-white border-b border-sky-100 shrink-0">
        {categories.map((cat: string) => (
          <button
            key={cat}
            onPointerDown={() => setActiveCategory(cat)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[44px] transition-colors
              ${activeCategory === cat
                ? 'bg-sky-400 text-white'
                : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
              }
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Produkt-Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-500">
            Keine Produkte verfügbar
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {filteredProducts.map((product: Product) => (
              <button
                key={product.id}
                onPointerDown={() => onAddToCart(product)}
                className="
                  bg-white shadow-sm rounded-xl min-h-[80px] p-3
                  flex flex-col justify-between items-start
                  active:bg-sky-50 transition-colors text-left
                "
              >
                <span className="text-slate-800 font-medium text-sm leading-tight line-clamp-3">
                  {product.name}
                </span>
                <span className="text-sky-700 font-semibold text-sm mt-1">
                  {formatEur(product.salePrice)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
