import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SHOP_ID } from '../../../db/index.js';
import type { Product } from '../../../db/index.js';
import { formatEur } from '../../pos/utils.js';
import { ProductForm } from './ProductForm.js';
import { StockAdjustModal } from './StockAdjustModal.js';

type ProductListView = 'list' | 'form' | 'stock';

export function ProductList() {
  const [view, setView] = useState<ProductListView>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [activeCategory, setActiveCategory] = useState<string>('Alle');

  // Alle Produkte des aktuellen Shops (auch inaktive), alphabetisch nach Name
  const products = useLiveQuery(
    () =>
      db.products
        .where('shopId')
        .equals(SHOP_ID)
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
    await db.products.update(product.id, {
      active: !product.active,
      updatedAt: Date.now(),
    });
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

  if (!products) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500">
        Laden...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header mit "Neues Produkt"-Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-sky-800">Produkte</h2>
        <button
          onPointerDown={openNewForm}
          className="bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold px-4 py-2 rounded-lg h-11 text-sm transition-colors"
        >
          + Neues Produkt
        </button>
      </div>

      {/* Kategorie-Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onPointerDown={() => setActiveCategory(cat)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[44px] transition-colors
              ${activeCategory === cat
                ? 'bg-sky-500 text-white'
                : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
              }
            `}
          >
            {cat}
          </button>
        ))}
      </div>

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
                className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 ${
                  !product.active ? 'opacity-60' : ''
                }`}
              >
                {/* Produktinfo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 truncate">{product.name}</span>
                    {!product.active && (
                      <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">
                        Inaktiv
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    Art.-Nr. {product.articleNumber} · {product.category}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    <span className="text-sky-700 font-semibold">{formatEur(product.salePrice)}</span>
                    <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-slate-600'}`}>
                      Bestand: {product.stock}
                      {isLowStock && ' ⚠'}
                    </span>
                  </div>
                </div>

                {/* Aktionsbuttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onPointerDown={() => openEditForm(product)}
                    className="bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-700 font-medium px-3 py-2 rounded-lg h-11 text-sm transition-colors"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onPointerDown={() => openStockAdjust(product)}
                    className="bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-700 font-medium px-3 py-2 rounded-lg h-11 text-sm transition-colors"
                  >
                    Bestand
                  </button>
                  <button
                    onPointerDown={() => handleToggleActive(product)}
                    className={`font-medium px-3 py-2 rounded-lg h-11 text-sm transition-colors ${
                      product.active
                        ? 'bg-rose-100 hover:bg-rose-200 active:bg-rose-300 text-rose-700'
                        : 'bg-green-100 hover:bg-green-200 active:bg-green-300 text-green-700'
                    }`}
                  >
                    {product.active ? 'Deaktivieren' : 'Aktivieren'}
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
