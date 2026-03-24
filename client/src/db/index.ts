import { FairstandDB } from './schema.js';
export type { Product, Sale, SaleItem, CartItem, PersistedCartItem, OutboxEntry, Category } from './schema.js';

export const db = new FairstandDB();

// Dynamische Shop-ID (wird nach Login über setShopId gesetzt)
let _shopId: string | null = null;

export function setShopId(id: string): void {
  _shopId = id;
}

export function getShopId(): string {
  if (!_shopId) throw new Error('Shop nicht gesetzt — zuerst einloggen');
  return _shopId;
}
