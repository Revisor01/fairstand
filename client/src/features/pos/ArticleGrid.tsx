import { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { getShopId } from '../../db/index.js';
import type { Product } from '../../db/index.js';
import { authFetch } from '../auth/serverAuth.js';
import { ArticleCard } from './ArticleCard.js';

interface ArticleGridProps {
  onAddToCart: (product: Product) => void;
  cartQuantities?: Record<string, number>;
}

export function ArticleGrid({ onAddToCart, cartQuantities = {} }: ArticleGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Alle');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // TQ mit networkMode 'offlineFirst' — im Online-Modus lädt vom Server,
  // im Offline-Modus greift TQ auf den gecachten Stand zurück (LIVE-06).
  // Gleicher queryKey ['products', shopId] wie Admin → gemeinsamer Cache.
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products', getShopId()],
    queryFn: async () => {
      const shopId = getShopId();
      const res = await authFetch(`/api/products?shopId=${shopId}`);
      if (!res.ok) throw new Error('Produkte konnten nicht geladen werden');
      const data = await res.json() as Record<string, unknown>[];
      return data.map(p => ({
        id: p.id as string,
        shopId: (p.shop_id ?? p.shopId) as string,
        articleNumber: (p.article_number ?? p.articleNumber) as string,
        name: p.name as string,
        category: (p.category ?? '') as string,
        purchasePrice: Number(p.purchase_price ?? p.purchasePrice ?? 0),
        salePrice: Number(p.sale_price ?? p.salePrice ?? 0),
        vatRate: Number(p.vat_rate ?? p.vatRate ?? 7),
        stock: Number(p.stock ?? 0),
        minStock: Number(p.min_stock ?? p.minStock ?? 0),
        active: p.active === true || p.active === 'true',
        updatedAt: Number(p.updated_at ?? p.updatedAt ?? Date.now()),
        imageUrl: (p.image_url ?? p.imageUrl) as string | undefined,
      })).filter((p: Product) => p.active); // Nur aktive Produkte für POS
    },
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
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p: Product) => {
      if (activeCategory !== 'Alle' && p.category !== activeCategory) return false;
      if (!query) return true;
      return (
        p.articleNumber.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    });
  }, [products, activeCategory, searchQuery]);

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeCategory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Laden...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Suchfeld */}
      <div className="px-4 pt-3 pb-2 bg-white border-b border-sky-50 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Artikel suchen..."
            className="
              w-full h-11 pl-10 pr-10 rounded-full
              bg-sky-50 border border-sky-100
              text-base text-slate-800 placeholder-slate-400
              focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-300
            "
          />
          {searchQuery && (
            <button
              type="button"
              onPointerDown={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-sky-100"
              aria-label="Suche löschen"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      {/* Kategorie-Tabs */}
      <div
        ref={tabsContainerRef}
        className="
          flex gap-2 overflow-x-auto px-4 py-3
          bg-white border-b border-sky-100
          [&::-webkit-scrollbar]:hidden
          shrink-0
        "
      >
        {categories.map((cat: string) => (
          <button
            key={cat}
            ref={activeCategory === cat ? activeTabRef : null}
            onPointerDown={() => setActiveCategory(cat)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[44px] transition-colors
              ${activeCategory === cat
                ? 'bg-sky-500 text-white shadow-md font-semibold'
                : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
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
            {searchQuery ? `Keine Artikel gefunden für "${searchQuery}"` : 'Keine Produkte verfügbar'}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
            {filteredProducts.map((product: Product) => (
              <ArticleCard
                key={product.id}
                product={product}
                inCart={cartQuantities[product.id] ?? 0}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
