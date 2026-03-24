import { useState } from 'react';
import { db, getShopId } from '../../../db/index.js';
import type { Product } from '../../../db/index.js';

interface ProductFormProps {
  product?: Product;
  onClose: () => void;
}

interface FormValues {
  articleNumber: string;
  name: string;
  category: string;
  purchasePriceEur: string;
  salePriceEur: string;
  vatRate: string;
  stock: string;
  minStock: string;
}

function toEur(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function toCents(eurStr: string): number {
  // Komma → Punkt
  const normalized = eurStr.replace(',', '.');
  const val = parseFloat(normalized);
  if (isNaN(val) || val < 0) return 0;
  return Math.round(val * 100);
}

export function ProductForm({ product, onClose }: ProductFormProps) {
  const isEdit = Boolean(product);

  const [values, setValues] = useState<FormValues>({
    articleNumber: product?.articleNumber ?? '',
    name: product?.name ?? '',
    category: product?.category ?? '',
    purchasePriceEur: product ? toEur(product.purchasePrice) : '',
    salePriceEur: product ? toEur(product.salePrice) : '',
    vatRate: product ? String(product.vatRate) : '7',
    stock: product ? String(product.stock) : '0',
    minStock: product ? String(product.minStock) : '0',
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleChange(field: keyof FormValues, value: string) {
    setValues(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setError(null);

    if (!values.name.trim()) {
      setError('Bitte einen Produktnamen eingeben.');
      return;
    }
    if (!values.articleNumber.trim()) {
      setError('Bitte eine Artikelnummer eingeben.');
      return;
    }

    const purchasePrice = toCents(values.purchasePriceEur);
    const salePrice = toCents(values.salePriceEur);
    const vatRate = parseInt(values.vatRate, 10);
    const minStock = Math.max(0, parseInt(values.minStock, 10) || 0);

    setSaving(true);
    try {
      const updatedAt = Date.now();

      if (isEdit && product) {
        const updateData = {
          articleNumber: values.articleNumber.trim(),
          name: values.name.trim(),
          category: values.category.trim(),
          purchasePrice,
          salePrice,
          vatRate,
          minStock,
          updatedAt,
        };
        await db.products.update(product.id, updateData);

        // Server-Sync bei Online-Status (fire-and-forget, Fehler nicht blockieren)
        if (navigator.onLine) {
          const productData = { ...product, ...updateData };
          fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData),
          }).catch(err => console.warn('Server-Sync fehlgeschlagen:', err));
        }
      } else {
        const stock = Math.max(0, parseInt(values.stock, 10) || 0);
        const productData = {
          id: crypto.randomUUID(),
          shopId: getShopId(),
          articleNumber: values.articleNumber.trim(),
          name: values.name.trim(),
          category: values.category.trim(),
          purchasePrice,
          salePrice,
          vatRate,
          stock,
          minStock,
          active: true,
          updatedAt,
        };
        await db.products.add(productData);

        // Server-Sync bei Online-Status (fire-and-forget, Fehler nicht blockieren)
        if (navigator.onLine) {
          fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData),
          }).catch(err => console.warn('Server-Sync fehlgeschlagen:', err));
        }
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-sky-800">
          {isEdit ? 'Produkt bearbeiten' : 'Neues Produkt'}
        </h2>
        <button
          onPointerDown={onClose}
          className="text-slate-500 hover:text-slate-700 text-sm px-3 py-2 rounded-lg h-11"
        >
          Abbrechen
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">Artikelnummer *</label>
          <input
            type="text"
            value={values.articleNumber}
            onChange={e => handleChange('articleNumber', e.target.value)}
            className="h-12 text-lg border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-sky-400"
            placeholder="z.B. 12345"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">Produktname *</label>
          <input
            type="text"
            value={values.name}
            onChange={e => handleChange('name', e.target.value)}
            className="h-12 text-lg border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-sky-400"
            placeholder="z.B. Fairtrade Schokolade 100g"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">Kategorie</label>
          <input
            type="text"
            value={values.category}
            onChange={e => handleChange('category', e.target.value)}
            className="h-12 text-lg border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-sky-400"
            placeholder="z.B. Schokolade"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600">EK-Preis (€)</label>
            <input
              type="text"
              inputMode="decimal"
              value={values.purchasePriceEur}
              onChange={e => handleChange('purchasePriceEur', e.target.value)}
              className="h-12 text-lg border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-sky-400"
              placeholder="0,00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600">VK-Preis (€)</label>
            <input
              type="text"
              inputMode="decimal"
              value={values.salePriceEur}
              onChange={e => handleChange('salePriceEur', e.target.value)}
              className="h-12 text-lg border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-sky-400"
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">MwSt-Satz</label>
          <select
            value={values.vatRate}
            onChange={e => handleChange('vatRate', e.target.value)}
            className="h-12 text-lg border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-sky-400 bg-white"
          >
            <option value="7">7 % (ermäßigt)</option>
            <option value="19">19 % (Regelsteuersatz)</option>
          </select>
        </div>

        {!isEdit && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600">Anfangsbestand</label>
            <input
              type="number"
              min="0"
              step="1"
              value={values.stock}
              onChange={e => handleChange('stock', e.target.value)}
              className="h-12 text-lg border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-sky-400"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">
            Mindestbestand (0 = keine Warnung)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={values.minStock}
            onChange={e => handleChange('minStock', e.target.value)}
            className="h-12 text-lg border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-sky-400"
          />
        </div>
      </div>

      <button
        onPointerDown={handleSave}
        disabled={saving}
        className="bg-sky-500 hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 text-white font-semibold px-4 py-3 rounded-xl h-14 text-lg transition-colors"
      >
        {saving ? 'Speichern...' : isEdit ? 'Änderungen speichern' : 'Produkt anlegen'}
      </button>
    </div>
  );
}
