import Dexie, { type EntityTable } from 'dexie';

export interface Product {
  id: string;
  shopId: string;
  articleNumber: string;
  name: string;
  category: string;
  purchasePrice: number; // Cent-Integer (EK-Preis nach Rabatt)
  salePrice: number;     // Cent-Integer (VK-Preis = EVP)
  vatRate: number;       // 7 oder 19
  stock: number;
  minStock: number;      // 0 = kein Mindestbestand (Opt-in)
  active: boolean;
  imageUrl?: string;     // undefined = kein Bild
  updatedAt: number;     // Unix-Timestamp ms für LWW-Sync
}

export interface SaleItem {
  productId: string;
  articleNumber: string;
  name: string;
  salePrice: number; // Cent-Integer — Snapshot zum Kaufzeitpunkt
  quantity: number;
}

export type CartItem = SaleItem;

export interface Sale {
  id: string;
  shopId: string;
  items: SaleItem[];
  totalCents: number;
  paidCents: number;
  changeCents: number;
  donationCents: number;
  createdAt: number;  // Unix-Timestamp ms
  syncedAt?: number;  // undefined = noch nicht gesynct
  cancelledAt?: number;     // Unix-Timestamp ms, undefined = aktiv
  returnedItems?: string[]; // productIds die zurückgegeben wurden
}

export interface OutboxEntry {
  id?: number; // ++id auto-increment
  operation: 'SALE_COMPLETE' | 'STOCK_ADJUST' | 'SALE_CANCEL' | 'ITEM_RETURN';
  payload: unknown;
  shopId: string;
  createdAt: number;
  attempts: number;
}

export class FairstandDB extends Dexie {
  products!: EntityTable<Product, 'id'>;
  sales!: EntityTable<Sale, 'id'>;
  outbox!: EntityTable<OutboxEntry, 'id'>;

  constructor() {
    super('fairstand-db');
    this.version(1).stores({
      products: 'id, shopId, category, active, [shopId+active]',
      sales: 'id, shopId, createdAt, syncedAt',
      outbox: '++id, shopId, createdAt, operation',
    });
    this.version(2).stores({
      products: 'id, shopId, category, active, [shopId+active]',
      sales: 'id, shopId, createdAt, syncedAt',
      outbox: '++id, shopId, createdAt, operation',
    }).upgrade(tx => {
      return tx.table('products').toCollection().modify(product => {
        if (product.minStock === undefined) {
          product.minStock = 0;
        }
      });
    });
    this.version(3).stores({
      products: 'id, shopId, category, active, [shopId+active]',
      sales: 'id, shopId, createdAt, syncedAt',
      outbox: '++id, shopId, createdAt, operation',
    }).upgrade(async tx => {
      // Hard Reset: alle lokalen Produkte löschen
      // Beim v2.0-Update lädt die App alles neu vom Server
      await tx.table('products').clear();
    });
    this.version(4).stores({
      products: 'id, shopId, category, active, [shopId+active]',
      sales: 'id, shopId, createdAt, syncedAt, cancelledAt',
      outbox: '++id, shopId, createdAt, operation',
    }).upgrade(_tx => {
      // cancelledAt und returnedItems sind optionale Felder — Dexie füllt undefined
      return Promise.resolve();
    });
    this.version(5).stores({
      products: 'id, shopId, category, active, [shopId+active]',
      sales: 'id, shopId, createdAt, syncedAt, cancelledAt',
      outbox: '++id, shopId, createdAt, operation',
    });
    this.version(6).stores({
      products: 'id, shopId, category, active, [shopId+active]',
      sales: 'id, shopId, createdAt, syncedAt, cancelledAt',
      outbox: '++id, shopId, createdAt, operation',
    }).upgrade(async tx => {
      // Fix: alte Einträge hatten shopId=undefined wegen snake_case-Bug im Sync
      await tx.table('products').clear();
    });
  }
}
