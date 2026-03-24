import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getShopId } from '../../db/index.js';
import type { Product } from '../../db/index.js';
import { getAuthHeaders } from '../auth/serverAuth.js';
import { ArticleCard } from './ArticleCard.js';

interface ArticleGridProps {
  onAddToCart: (product: Product) => void;
}

export function ArticleGrid({ onAddToCart }: ArticleGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Alle');

  // TQ mit networkMode 'offlineFirst' — im Online-Modus lädt vom Server,
  // im Offline-Modus greift TQ auf den gecachten Stand zurück (LIVE-06).
  // Gleicher queryKey ['products', shopId] wie Admin → gemeinsamer Cache.
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products', getShopId()],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const shopId = getShopId();
      const res = await fetch(`/api/products?shopId=${shopId}`, { headers });
      if (!res.ok) throw new Error('Produkte konnten nicht geladen werden');
      const data = await res.json() as Record<string, unknown>[];
      return data.map(p => ({
        id: p.id as string,
        shopId: (p.shop_id ?? p.shopId) as string,
        articleNumber: (p.article_number ?? p.articleNumber) as string,
        name: p.name as string,
        category: (p.category ?? '') as string,
        purchasePrice: (p.purchase_price ?? p.purchasePrice ?? 0) as number,
        salePrice: (p.sale_price ?? p.salePrice) as number,
        vatRate: (p.vat_rate ?? p.vatRate ?? 7) as number,
        stock: (p.stock ?? 0) as number,
        minStock: (p.min_stock ?? p.minStock ?? 0) as number,
        active: (p.active ?? true) as boolean,
        updatedAt: (p.updated_at ?? p.updatedAt ?? Date.now()) as number,
        imageUrl: (p.image_url ?? p.imageUrl) as string | undefined,
      })).filter(p => p.active); // Nur aktive Produkte für POS
    },
    networkMode: 'offlineFirst',
    staleTime: 60_000, // POS: 1 Minute — etwas länger als Admin, da POS stabiler ist
  });

  // Alphabetisch sortierte unique Kategorien aus den geladenen Produkten
  const categories = useMemo((): string[] => {
    if (!products) return [];
    const unique = [...new Set(products.map((p: Product) => p.category))].sort();
    return ['Alle', ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (activeCategory === 'Alle') return products;
    return products.filter((p: Product) => p.category === activeCategory);
  }, [products, activeCategory]);

  if (isLoading) {
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
      <div className="flex-1 overflow-y-auto p-6">
        {filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-500">
            Keine Produkte verfügbar
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
            {filteredProducts.map((product: Product) => (
              <ArticleCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
