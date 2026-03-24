import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getShopId } from '../../../db/index.js';
import type { Product } from '../../../db/index.js';
import { formatEur } from '../../pos/utils.js';
import { downloadProducts, downloadCategories } from '../../../sync/engine.js';
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
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const dbCategories = useLiveQuery(
    () => db.categories.where('shopId').equals(getShopId()).sortBy('name'),
    []
  );

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

  async function handleAddCategory() {
    const name = newCatName.trim();
    if (!name) return;
    if (!navigator.onLine) {
      alert('Kategorien können nur bei bestehender Internetverbindung verwaltet werden.');
      return;
    }
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: getShopId(), name }),
      });
      if (!res.ok) throw new Error('Fehler beim Anlegen der Kategorie');
      await downloadCategories();
      setNewCatName('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Anlegen der Kategorie');
    }
  }

  async function handleRenameCategory(id: string, oldName: string) {
    const newName = window.prompt('Neuer Name:', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    if (!navigator.onLine) {
      alert('Kategorien können nur bei bestehender Internetverbindung verwaltet werden.');
      return;
    }
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error('Fehler beim Umbenennen der Kategorie');
      await downloadCategories();
      await downloadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Umbenennen der Kategorie');
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!navigator.onLine) {
      alert('Kategorien können nur bei bestehender Internetverbindung verwaltet werden.');
      return;
    }
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (res.status === 409) {
        const data = await res.json() as { error: string };
        alert(data.error);
        return;
      }
      if (!res.ok) throw new Error('Fehler beim Löschen der Kategorie');
      await downloadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Löschen der Kategorie');
    }
  }

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

  async function handleImageUpload(productId: string, file: File | undefined) {
    if (!file || !navigator.onLine) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch(`/api/products/${productId}/image`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) return;
      const { imageUrl } = await res.json() as { imageUrl: string };
      await db.products.update(productId, { imageUrl });
    } catch {
      // Stilles Fail — kein Offline-Support für Bilder nötig
    }
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-sky-800">Produkte</h2>
        <div className="flex items-center gap-2">
          <button
            onPointerDown={handleDownloadSync}
            disabled={syncing}
            className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium px-4 py-2 rounded-lg h-11 text-sm transition-colors disabled:opacity-50"
          >
            {syncing ? 'Laden...' : 'Daten laden'}
          </button>
          <button
            onPointerDown={openNewForm}
            className="bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold px-4 py-2 rounded-lg h-11 text-sm transition-colors"
          >
            + Neues Produkt
          </button>
        </div>
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

      {/* Kategorien verwalten */}
      <div>
        <button
          onPointerDown={() => setShowCatModal(true)}
          className="text-sky-600 text-sm underline"
        >
          Kategorien verwalten
        </button>
      </div>

      {/* Kategorie-Verwaltungs-Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-sky-800">Kategorien verwalten</h3>
              <button
                onPointerDown={() => setShowCatModal(false)}
                className="text-slate-500 hover:text-slate-700 text-xl font-bold px-2 py-1 rounded-lg"
              >
                ×
              </button>
            </div>

            {/* Kategorienliste */}
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {!dbCategories || dbCategories.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Noch keine Kategorien angelegt.</p>
              ) : (
                dbCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-slate-800 font-medium">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onPointerDown={() => handleRenameCategory(cat.id, cat.name)}
                        className="text-sky-600 text-sm hover:text-sky-800 px-2 py-1 rounded"
                      >
                        Umbenennen
                      </button>
                      <button
                        onPointerDown={() => handleDeleteCategory(cat.id)}
                        className="text-rose-600 text-sm hover:text-rose-800 px-2 py-1 rounded"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Neue Kategorie hinzufügen */}
            <div className="flex gap-2 border-t border-slate-200 pt-4">
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                placeholder="Neue Kategorie..."
                className="flex-1 h-11 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-sky-400"
              />
              <button
                onPointerDown={handleAddCategory}
                className="bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-medium px-4 py-2 rounded-lg h-11 text-sm transition-colors"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}

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
                className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 ${
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
                    <span className="flex items-center gap-1">
                      <span className={`text-[10px] leading-none ${
                        product.stock === 0
                          ? 'text-rose-500'
                          : product.minStock > 0 && product.stock <= product.minStock
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                      }`}>●</span>
                      <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-slate-600'}`}>
                        Bestand: {product.stock}
                      </span>
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
                  <label className="bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-700 font-medium px-3 py-2 rounded-lg h-11 text-sm transition-colors cursor-pointer flex items-center">
                    Bild
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => handleImageUpload(product.id, e.target.files?.[0])}
                    />
                  </label>
                  <button
                    onPointerDown={() => openStats(product)}
                    className="bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-700 font-medium px-3 py-2 rounded-lg h-11 text-sm transition-colors"
                  >
                    Statistik
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
