import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, getShopId } from '../../db/index.js';
import { getAuthHeaders } from '../../features/auth/serverAuth.js';
import type { Product } from '../../db/index.js';

// Server liefert snake_case — camelCase-Mapping nötig
function mapServerProduct(p: Record<string, unknown>): Product {
  return {
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
  };
}

export function useProducts() {
  const shopId = getShopId();
  return useQuery<Product[]>({
    queryKey: ['products', shopId],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/products?shopId=${shopId}`, { headers });
        if (!res.ok) throw new Error('Produkte konnten nicht geladen werden');
        const data = await res.json() as Record<string, unknown>[];
        const products = data.map(mapServerProduct);

        // Write-Through: Dexie als Offline-Cache aktuell halten
        // Fire-and-forget — wirft keinen Fehler nach oben wenn IDB scheitert
        db.transaction('rw', db.products, async () => {
          await db.products.where('shopId').equals(shopId).delete();
          await db.products.bulkPut(products);
        }).catch(() => {});

        return products;
      } catch {
        // Offline oder Netzwerkfehler — Dexie-Cache als Fallback
        const cached = await db.products.where('shopId').equals(shopId).toArray();
        if (cached.length > 0) return cached;
        throw new Error('Keine Produkte verfügbar (offline, kein lokaler Cache)');
      }
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productData: Product) => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(productData),
      });
      if (!res.ok) throw new Error('Produkt konnte nicht gespeichert werden');
      return productData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', getShopId()] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productData: Product) => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/products', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...productData, updatedAt: Date.now() }),
      });
      if (!res.ok) throw new Error('Produkt konnte nicht aktualisiert werden');
      return productData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', getShopId()] });
    },
  });
}

export function useToggleProductActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, active }: { productId: string; active: boolean }) => {
      const headers = await getAuthHeaders();
      const action = active ? 'activate' : 'deactivate';
      const res = await fetch(`/api/products/${productId}/${action}`, {
        method: 'PATCH',
        headers,
      });
      if (!res.ok) throw new Error('Status konnte nicht geändert werden');
      return { productId, active };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', getShopId()] });
    },
  });
}

// STOCK_ADJUST: direkt via POST /api/sync mit STOCK_ADJUST OutboxEntry
// (Server-Route sync.ts verarbeitet STOCK_ADJUST per Delta)
export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      delta,
      reason,
    }: {
      productId: string;
      delta: number;
      reason?: string;
    }) => {
      const shopId = getShopId();
      const headers = await getAuthHeaders();
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entries: [
            {
              operation: 'STOCK_ADJUST',
              payload: { productId, delta, reason, shopId },
              shopId,
              createdAt: Date.now(),
              attempts: 0,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error('Bestandskorrektur fehlgeschlagen');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', getShopId()] });
    },
  });
}
