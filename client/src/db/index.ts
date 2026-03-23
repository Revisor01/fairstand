import { FairstandDB } from './schema.js';
export type { Product, Sale, SaleItem, CartItem, OutboxEntry } from './schema.js';

export const db = new FairstandDB();
export const SHOP_ID = 'st-secundus-hennstedt';
