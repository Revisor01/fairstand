import { useMemo, useState } from 'react';
import { Pencil, BarChart3, Package, Eye, EyeOff, Plus } from 'lucide-react';
import type { Product } from '../../../db/index.js';
import { formatEur } from '../../pos/utils.js';
import { useProducts, useToggleProductActive } from '../../../hooks/api/useProducts.js';
import { ProductForm } from './ProductForm.js';
import { StockAdjustModal } from './StockAdjustModal.js';
import { ProductStats } from './ProductStats.js';

type ProductListView = 'list' | 'form' | 'stock' | 'stats';

export function ProductList() {
  const [view, setView] = useState<ProductListView>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [activeCategory, setActiveCategory] = useState<string>('Alle');

  const { data: rawProducts, isLoading } = useProducts();
  const toggleActive = useToggleProductActive();

  const products = useMemo(
    () => rawProducts ? [...rawProducts].sort((a, b) => a.name.localeCompare(b.name, 'de')) : undefined,
    [rawProducts]
  );

  const outOfStockCount = useMemo(() => {
    if (!products) return 0;
    return products.filter(p => p.stock <= 0).length;
  }, [products]);

  const categories = useMemo((): string[] => {
    if (!products) return [];
    const unique = [...new Set(products.map(p => p.category))].sort();
    return ['Alle', ...(outOfStockCount > 0 ? ['Ausverkauft'] : []), ...unique];
  }, [products, outOfStockCount]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (activeCategory === 'Alle') return products;
    if (activeCategory === 'Ausverkauft') return products.filter(p => p.stock <= 0);
    return products.filter(p => p.category === activeCategory);
  }, [products, activeCategory]);

  async function handleToggleActive(product: Product) {
    await toggleActive.mutateAsync({ productId: product.id, active: !product.active });
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

  if (isLoading) {
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
              ${cat === 'Ausverkauft'
                ? activeCategory === cat
                  ? 'bg-rose-500 text-white font-semibold'
                  : 'bg-rose-50 text-rose-600 active:bg-rose-100'
                : activeCategory === cat
                  ? 'bg-sky-500 text-white'
                  : 'bg-sky-100 text-sky-700 active:bg-sky-200'
              }
            `}
          >
            {cat}
            {cat === 'Ausverkauft' && (
              <span className={`ml-1 inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-bold ${
                activeCategory === cat ? 'bg-white/30 text-white' : 'bg-rose-500 text-white'
              }`}>
                {outOfStockCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Produktliste */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          {activeCategory === 'Alle' ? 'Noch keine Produkte angelegt.' : activeCategory === 'Ausverkauft' ? 'Keine ausverkauften Produkte.' : 'Keine Produkte in dieser Kategorie.'}
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
