import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getShopId } from '../../../db/index.js';
import type { Product } from '../../../db/index.js';
import { formatEur } from '../../pos/utils.js';
import { downloadProducts } from '../../../sync/engine.js';
import { ProductForm } from './ProductForm.js';
import { StockAdjustModal } from './StockAdjustModal.js';
import { ProductStats } from './ProductStats.js';

type ProductListView = 'list' | 'form' | 'stock' | 'stats';

export function ProductList() {
  const [view, setView] = useState<ProductListView>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [activeCategory, setActiveCategory] = useState<string>('Alle');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Alle Produkte des aktuellen Shops (auch inaktive), alphabetisch nach Name
  const products = useLiveQuery(
    () =>
      db.products
        .where('shopId')
        // Sicherheitshinweis: getShopId() wirft wenn kein Shop gesetzt ist.
        // ProductList wird nur gerendert wenn state === 'unlocked' (App.tsx),
        // also ist shopId hier garantiert gesetzt. Kein try-catch nötig.
        .equals(getShopId())
        .toArray()
        .then(arr => arr.sort((a, b) => a.name.localeCompare(b.name, 'de'))),
    []
  );

  const categories = useMemo((): string[] => {
    if (!products) return [];
    const unique = [...new Set(products.map(p => p.category))].sort();
    return ['Alle', ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (activeCategory === 'Alle') return products;
    return products.filter(p => p.category === activeCategory);
  }, [products, activeCategory]);

  async function handleToggleActive(product: Product) {
    const newActive = !product.active;
    const now = Date.now();
    // Lokal in Dexie sofort aktualisieren (offline-faehig)
    await db.products.update(product.id, {
      active: newActive,
      updatedAt: now,
    });
    // Fire-and-forget PATCH an Server wenn online
    if (navigator.onLine) {
      const action = newActive ? 'activate' : 'deactivate';
      fetch(`/api/products/${product.id}/${action}`, { method: 'PATCH' }).catch(() => {});
    }
  }

  async function handleDownloadSync() {
    if (!navigator.onLine) {
      setSyncResult('Keine Internetverbindung');
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    try {
      const count = await downloadProducts();
      setSyncResult(`${count} Produkt${count !== 1 ? 'e' : ''} aktualisiert`);
    } catch {
      setSyncResult('Sync fehlgeschlagen');
    } finally {
      setSyncing(false);
    }
  }

  function openNewForm() {
    setSelectedProduct(undefined);
    setView('form');
  }

  function openEditForm(product: Product) {
    setSelectedProduct(product);
    setView('form');
  }

  function openStockAdjust(product: Product) {
    setSelectedProduct(product);
    setView('stock');
  }

  function openStats(product: Product) {
    setSelectedProduct(product);
    setView('stats');
  }

  function handleClose() {
    setSelectedProduct(undefined);
    setView('list');
  }

  if (view === 'form') {
    return <ProductForm product={selectedProduct} onClose={handleClose} />;
  }

  if (view === 'stock' && selectedProduct) {
    return <StockAdjustModal product={selectedProduct} onClose={handleClose} />;
  }

  if (view === 'stats' && selectedProduct) {
    return <ProductStats product={selectedProduct} onClose={handleClose} />;
  }

  if (!products) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500">
        Laden...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header mit Buttons */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-sky-800">Produkte</h2>
        <div className="flex items-center gap-2">
          <button
            onPointerDown={handleDownloadSync}
            disabled={syncing}
            className="bg-slate-100 active:bg-slate-300 text-slate-700 font-medium px-3 py-2 rounded-lg min-h-[44px] text-sm transition-colors disabled:opacity-50"
          >
            {syncing ? '...' : '↓ Sync'}
          </button>
          <button
            onPointerDown={openNewForm}
            className="bg-sky-500 active:bg-sky-700 text-white font-semibold px-3 py-2 rounded-lg min-h-[44px] text-sm transition-colors"
          >
            + Neu
          </button>
        </div>
      </div>

      {/* Kategorie-Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {categories.map(cat => (
          <button
            key={cat}
            onPointerDown={() => setActiveCategory(cat)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap min-h-[36px] transition-colors
              ${activeCategory === cat
                ? 'bg-sky-500 text-white'
                : 'bg-sky-100 text-sky-700 active:bg-sky-200'
              }
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sync-Ergebnis */}
      {syncResult && (
        <div className="bg-sky-50 text-sky-700 text-sm px-4 py-2 rounded-lg">
          {syncResult}
        </div>
      )}

      {/* Produktliste */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          {activeCategory === 'Alle' ? 'Noch keine Produkte angelegt.' : 'Keine Produkte in dieser Kategorie.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredProducts.map(product => {
            const isLowStock = product.minStock > 0 && product.stock <= product.minStock;
            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl shadow-sm p-3 flex items-center gap-3 ${
                  !product.active ? 'opacity-60' : ''
                }`}
              >
                {/* Vorschaubild */}
                {product.imageUrl && (
                  <img src={product.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                )}

                {/* Produktinfo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm leading-snug truncate">{product.name}</span>
                    {!product.active && (
                      <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">
                        Inaktiv
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {product.articleNumber} · {product.category}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs">
                    <span className="text-sky-700 font-semibold">{formatEur(product.salePrice)}</span>
                    <span className="flex items-center gap-1">
                      <span className={`text-[10px] leading-none ${
                        product.stock === 0
                          ? 'text-rose-500'
                          : product.minStock > 0 && product.stock <= product.minStock
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                      }`}>●</span>
                      <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-slate-600'}`}>
                        {product.stock}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Aktionsbuttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onPointerDown={() => openEditForm(product)}
                    title="Bearbeiten"
                    className="bg-sky-100 active:bg-sky-300 text-sky-700 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </button>
                  <button
                    onPointerDown={() => openStats(product)}
                    title="Statistik"
                    className="bg-sky-100 active:bg-sky-300 text-sky-700 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                  </button>
                  <button
                    onPointerDown={() => openStockAdjust(product)}
                    title="Bestand"
                    className="bg-amber-100 active:bg-amber-300 text-amber-700 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                  </button>
                  <button
                    onPointerDown={() => handleToggleActive(product)}
                    title={product.active ? 'Deaktivieren' : 'Aktivieren'}
                    className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                      product.active
                        ? 'bg-rose-100 active:bg-rose-300 text-rose-700'
                        : 'bg-green-100 active:bg-green-300 text-green-700'
                    }`}
                  >
                    {product.active
                      ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
