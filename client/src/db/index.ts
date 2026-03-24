// Typen — direkt hier definiert (kein Dexie mehr)
export interface Category {
  id: string;
  shopId: string;
  name: string;
  sortOrder: number;
  createdAt: number;
}

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
  updatedAt: number;
}

export interface SaleItem {
  productId: string;
  articleNumber: string;
  name: string;
  salePrice: number; // Cent-Integer — Snapshot zum Kaufzeitpunkt
  purchasePrice?: number; // Cent-Integer — EK-Preis Snapshot (für Entnahmen)
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
  type?: 'sale' | 'withdrawal'; // undefined/'sale' = normaler Verkauf, 'withdrawal' = Entnahme KG zum EK
  withdrawalReason?: string; // Grund der Entnahme (z.B. "Gemeindenachmittag", "Küche")
  createdAt: number;  // Unix-Timestamp ms
  syncedAt?: number;  // undefined = noch nicht gesynct
  cancelledAt?: number;     // Unix-Timestamp ms, undefined = aktiv
  returnedItems?: string[]; // productIds die zurückgegeben wurden
}

// shopId-State — wird nach Login gesetzt
let _shopId: string | null = null;

export function setShopId(id: string): void {
  _shopId = id;
}

export function getShopId(): string {
  if (!_shopId) throw new Error('Shop nicht gesetzt — zuerst einloggen');
  return _shopId;
}
