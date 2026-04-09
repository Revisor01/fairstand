import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShopId } from '../../db/index.js';
import { authFetch } from '../../features/auth/serverAuth.js';
import type { Product } from '../../db/index.js';

// Server liefert snake_case — camelCase-Mapping nötig
function mapServerProduct(p: Record<string, unknown>): Product {
  return {
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
    lastSaleAt: p.last_sale_at != null ? Number(p.last_sale_at) : null,
  };
}

export function useProducts() {
  const shopId = getShopId();
  return useQuery<Product[]>({
    queryKey: ['products', shopId],
    queryFn: async () => {
      const res = await authFetch(`/api/products?shopId=${shopId}`);
      if (!res.ok) throw new Error('Produkte konnten nicht geladen werden');
      const data = await res.json() as Record<string, unknown>[];
      return data.map(mapServerProduct);
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productData: Product) => {
      const res = await authFetch('/api/products', {
        method: 'POST',
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
      const res = await authFetch('/api/products', {
        method: 'POST',
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
      const action = active ? 'activate' : 'deactivate';
      const res = await authFetch(`/api/products/${productId}/${action}`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Status konnte nicht geändert werden');
      return { productId, active };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', getShopId()] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const res = await authFetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      if (res.status === 409) {
        const data = await res.json() as { error: string };
        throw new Error(data.error ?? 'Artikel kann nicht gelöscht werden.');
      }
      if (!res.ok) throw new Error('Artikel konnte nicht gelöscht werden.');
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
      purchasePriceCents,
    }: {
      productId: string;
      delta: number;
      reason?: string;
      purchasePriceCents?: number; // EK-Preis bei Zugang (optional, Server nutzt Produkt-EK als Fallback)
    }) => {
      const shopId = getShopId();
      const res = await authFetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify({
          entries: [
            {
              operation: 'STOCK_ADJUST',
              payload: { productId, delta, reason, shopId, purchasePriceCents },
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
