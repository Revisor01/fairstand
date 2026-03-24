import { useLiveQuery } from 'dexie-react-hooks';
import { db, getShopId } from '../db/index.js';

export function useLowStockProducts() {
  return useLiveQuery(
    () =>
      db.products
        .where('[shopId+active]')
        .equals([getShopId(), 1])
        .filter(p => p.minStock > 0 && p.stock <= p.minStock)
        .toArray(),
    [],
    []
  );
}

export function useLowStockCount(): number {
  const products = useLowStockProducts();
  return products.length;
}
