import { useProducts } from './api/useProducts.js';

export function useLowStockProducts() {
  const { data: products = [] } = useProducts();
  return products.filter(p => p.active && p.minStock > 0 && p.stock <= p.minStock);
}

export function useLowStockCount(): number {
  return useLowStockProducts().length;
}
