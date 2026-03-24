import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShopId } from '../../db/index.js';
import { getAuthHeaders } from '../../features/auth/serverAuth.js';
import type { Category } from '../../db/index.js';

export function useCategories() {
  const shopId = getShopId();
  return useQuery<Category[]>({
    queryKey: ['categories', shopId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/categories?shopId=${shopId}`, { headers });
      if (!res.ok) throw new Error('Kategorien konnten nicht geladen werden');
      const data = await res.json() as Record<string, unknown>[];
      return data.map(c => ({
        id: c.id as string,
        shopId: (c.shop_id ?? c.shopId) as string,
        name: c.name as string,
        sortOrder: (c.sort_order ?? c.sortOrder ?? 0) as number,
        createdAt: (c.created_at ?? c.createdAt ?? Date.now()) as number,
      }));
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Kategorie konnte nicht angelegt werden');
      return await res.json() as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', getShopId()] });
    },
  });
}

export function useRenameCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Umbenennen fehlgeschlagen');
    },
    onSuccess: () => {
      // Umbenennungen ändern auch Produktkategorien — beide invalidieren
      const shopId = getShopId();
      queryClient.invalidateQueries({ queryKey: ['categories', shopId] });
      queryClient.invalidateQueries({ queryKey: ['products', shopId] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.status === 409) {
        const data = await res.json() as { error: string };
        throw new Error(data.error);
      }
      if (!res.ok) throw new Error('Kategorie konnte nicht gelöscht werden');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', getShopId()] });
    },
  });
}
