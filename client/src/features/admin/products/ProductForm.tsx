import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ImagePlus, X as XIcon } from 'lucide-react';
import { getShopId } from '../../../db/index.js';
import type { Product } from '../../../db/index.js';
import { getAuthHeaders } from '../../auth/serverAuth.js';
import { useCategories } from '../../../hooks/api/useCategories.js';
import { useCreateProduct, useUpdateProduct } from '../../../hooks/api/useProducts.js';

interface ProductFormProps {
  product?: Product;
  onClose: () => void;
}

interface FormValues {
  articleNumber: string;
  name: string;
  categories: string[];
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
    categories: product?.categories ?? [],
    purchasePriceEur: product ? toEur(product.purchasePrice) : '',
    salePriceEur: product ? toEur(product.salePrice) : '',
    vatRate: product ? String(product.vatRate) : '7',
    stock: product ? String(product.stock) : '0',
    minStock: product ? String(product.minStock) : '0',
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.imageUrl ?? null
  );
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  const queryClient = useQueryClient();
  const { data: dbCategories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

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
          ...product,
          articleNumber: values.articleNumber.trim(),
          name: values.name.trim(),
          categories: values.categories,
          purchasePrice,
          salePrice,
          vatRate,
          minStock,
          updatedAt,
        };
        await updateProduct.mutateAsync(updateData);

        if (pendingImageFile) {
          const authHeaders = await getAuthHeaders();
          const formData = new FormData();
          formData.append('image', pendingImageFile);
          const imgRes = await fetch(`/api/products/${product.id}/image`, {
            method: 'POST',
            headers: { 'Authorization': authHeaders['Authorization'] ?? '' },
            body: formData,
          }).catch(() => null);
          if (imgRes?.ok) {
            // Produkte erneut invalidieren damit imageUrl frisch geladen wird
            queryClient.invalidateQueries({ queryKey: ['products', getShopId()] });
          }
        }
      } else {
        const stock = Math.max(0, parseInt(values.stock, 10) || 0);
        const productData: Product = {
          id: crypto.randomUUID(),
          shopId: getShopId(),
          articleNumber: values.articleNumber.trim(),
          name: values.name.trim(),
          categories: values.categories,
          purchasePrice,
          salePrice,
          vatRate,
          stock,
          minStock,
          active: true,
          updatedAt,
        };
        await createProduct.mutateAsync(productData);

        if (pendingImageFile) {
          const authHeaders = await getAuthHeaders();
          const formData = new FormData();
          formData.append('image', pendingImageFile);
          const imgRes = await fetch(`/api/products/${productData.id}/image`, {
            method: 'POST',
            headers: { 'Authorization': authHeaders['Authorization'] ?? '' },
            body: formData,
          }).catch(() => null);
          if (imgRes?.ok) {
            queryClient.invalidateQueries({ queryKey: ['products', getShopId()] });
          }
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
          className="text-slate-500 active:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors"
          aria-label="Abbrechen"
        >
          <ArrowLeft size={20} />
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
          <label className="text-sm font-medium text-slate-600">Kategorien</label>
          <div className="flex flex-wrap gap-2 pt-1">
            {/* Bekannte Kategorien aus der Datenbank */}
            {dbCategories?.map(cat => {
              const isSelected = values.categories.includes(cat.name);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onPointerDown={() => {
                    setValues(prev => ({
                      ...prev,
                      categories: isSelected
                        ? prev.categories.filter(c => c !== cat.name)
                        : [...prev.categories, cat.name],
                    }));
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium min-h-[36px] transition-colors ${
                    isSelected
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-sky-50 text-sky-700 border border-sky-200 active:bg-sky-100'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
            {/* Kategorien die am Produkt hängen, aber nicht mehr in der Liste sind */}
            {values.categories
              .filter(c => !dbCategories?.some(d => d.name === c))
              .map(c => (
                <button
                  key={c}
                  type="button"
                  onPointerDown={() => {
                    setValues(prev => ({
                      ...prev,
                      categories: prev.categories.filter(x => x !== c),
                    }));
                  }}
                  className="px-3 py-1.5 rounded-full text-sm font-medium min-h-[36px] bg-slate-200 text-slate-600 border border-slate-300 active:bg-slate-300 transition-colors"
                >
                  {c} ×
                </button>
              ))}
            {(!dbCategories || dbCategories.length === 0) && values.categories.length === 0 && (
              <span className="text-sm text-slate-400 italic">Noch keine Kategorien angelegt</span>
            )}
          </div>
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

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-600">Produktbild</label>
          {imagePreview && (
            <img
              src={imagePreview}
              alt=""
              className="w-24 h-24 object-cover rounded-xl border border-slate-200"
            />
          )}
          <label className="flex items-center justify-center gap-2 h-12 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer active:border-sky-400 text-sm text-slate-500 transition-colors">
            <ImagePlus size={18} />
            {imagePreview ? 'Bild ändern' : 'Bild auswählen'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  setPendingImageFile(f);
                  setImagePreview(URL.createObjectURL(f));
                }
              }}
            />
          </label>
          {imagePreview && (
            <button
              type="button"
              onPointerDown={() => {
                setImagePreview(null);
                setPendingImageFile(null);
              }}
              className="flex items-center gap-1 text-xs text-rose-500 active:text-rose-700 text-left"
            >
              <XIcon size={14} />
              Bild entfernen
            </button>
          )}
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
