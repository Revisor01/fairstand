import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, BarChart3, Package, Eye, EyeOff, RefreshCw, Plus } from 'lucide-react';
import { db, getShopId } from '../../../db/index.js';
import type { Product } from '../../../db/index.js';
import { formatEur } from '../../pos/utils.js';
import { downloadProducts } from '../../../sync/engine.js';
import { ProductForm } from './ProductForm.js';
import { StockAdjustModal } from './StockAdjustModal.js';
import { ProductStats } from './ProductStats.js';
import { getAuthHeaders } from '../../auth/serverAuth.js';

type ProductListView = 'list' | 'form' | 'stock' | 'stats';

export function ProductList() {
  const [view, setView] = useState<ProductListView>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [activeCategory, setActiveCategory] = useState<string>('Alle');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const products = useLiveQuery(
    () =>
      db.products
        .where('shopId')
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
    await db.products.update(product.id, {
      active: newActive,
      updatedAt: now,
    });
    if (navigator.onLine) {
      const action = newActive ? 'activate' : 'deactivate';
      getAuthHeaders().then(headers => {
        fetch(`/api/products/${product.id}/${action}`, { method: 'PATCH', headers }).catch(() => {});
      });
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
            className="bg-slate-100 active:bg-slate-300 text-slate-700 font-medium px-3 py-2 rounded-lg min-h-[44px] text-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            Sync
          </button>
          <button
            onPointerDown={openNewForm}
            className="bg-sky-500 active:bg-sky-700 text-white font-semibold px-3 py-2 rounded-lg min-h-[44px] text-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus size={16} />
            Neu
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
                    <Pencil size={18} />
                  </button>
                  <button
                    onPointerDown={() => openStats(product)}
                    title="Statistik"
                    className="bg-sky-100 active:bg-sky-300 text-sky-700 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
                  >
                    <BarChart3 size={18} />
                  </button>
                  <button
                    onPointerDown={() => openStockAdjust(product)}
                    title="Bestand"
                    className="bg-amber-100 active:bg-amber-300 text-amber-700 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
                  >
                    <Package size={18} />
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
                    {product.active ? <EyeOff size={18} /> : <Eye size={18} />}
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
