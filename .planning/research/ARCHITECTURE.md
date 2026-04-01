# Architecture: Inventur, Preis-History & Rechnungsexport (v8.0)

**Domain:** POS with inventory tracking, price history, and receipt export
**Researched:** 2026-04-01
**Current System Maturity:** v7.0 shipped — Online-Only, PostgreSQL, TanStack Query, WebSocket, Multi-Shop

---

## System Overview (Current + New)

### Existing Architecture (v7.0)

```
┌────────────────────────────────────────────────────────────┐
│            Browser (iPad/iPhone) — Online-Only              │
│                                                              │
│  React + TanStack Query (no local DB, server-backed)       │
│  ├─ Features: POS, Reports, Admin, Inventory, Storno       │
│  └─ WebSocket live-updates from /api/ws                    │
└───────────────────────┬──────────────────────────────────────┘
                        │
        ┌───────────────┴──────────────┐
        │                              │
    ┌───▼────────┐            ┌────────▼──────┐
    │ HTTP REST  │            │  WebSocket    │
    │ API        │            │  (port 3001)  │
    │ (port 3001)│            │  Events:      │
    └───┬────────┘            │  - products   │
        │                     │  - sales      │
        │                     │  - categories │
        │                     └───────────────┘
        │
    ┌───▼──────────────────────────────────────────┐
    │   Fastify 5 Backend                          │
    │                                              │
    │ Routes:                                      │
    │ ├─ /products (GET, POST, PATCH)             │
    │ ├─ /sales (GET, DELETE)                     │
    │ ├─ /reports (GET /monthly, /yearly)         │
    │ ├─ /categories (CRUD)                       │
    │ ├─ /shops (CRUD, Master-Admin)              │
    │ ├─ /auth (PIN-Login)                        │
    │ ├─ /import (PDF upload/parse)               │
    │ └─ /sync (legacy outbox, used offline)      │
    │                                              │
    │ Middleware:                                 │
    │ ├─ Session-Auth (sessionId → shopId)       │
    │ ├─ Rate-Limiting (PIN attempts)            │
    │ ├─ CORS (fail-closed)                      │
    │ └─ @fastify/websocket                      │
    └───┬─────────────────────────────────────────┘
        │
    ┌───▼────────────────────────────────────────────┐
    │  PostgreSQL 16                                  │
    │                                                 │
    │ Tables:                                        │
    │ ├─ products (id, shopId, name, EK, VK, stock) │
    │ ├─ sales (id, shopId, items-JSONB, totals)    │
    │ ├─ categories (id, shopId, name, sortOrder)   │
    │ ├─ shops (id, shopId, pin, isMaster, active)  │
    │ ├─ settings (key, value, shopId)              │
    │ ├─ outboxEvents (for audit)                   │
    │ └─ NO: price_history, stock_history           │
    └────────────────────────────────────────────────┘
```

### Design Constraints (from v7.0)

- **Online-Only:** App requires internet connection (Kirche has mobile coverage)
- **Shop-Isolation:** All queries filtered by `shopId` from session token
- **Row-Level Security:** No cross-shop data access at any layer
- **Server as Single Source of Truth:** TanStack Query reads from server, no client-side cache persistence
- **Type-Safe:** Drizzle ORM for SQL, Zod for API validation, TypeScript end-to-end
- **JSONB Sales Items:** Sale items stored as `items: jsonb('items').notNull()` — contains snapshot of product state at time of sale

---

## v8.0 New Features: Architectural Implications

### Feature 1: Inventur-Übersicht (Inventory Summary)

**What:** Annual (or periodic) inventory view showing:
- Per product: current stock, quantity sold (year-to-date), revenue (VK), cost (EK)
- Highlight products with no sales, near-zero stock, or high margins
- Export to CSV/PDF for annual audit trail

**Architectural impact:**
- **New DB table:** `price_history` — tracks EK/VK changes per product
- **Modified reports route:** Add `/api/reports/inventory?year=2026` endpoint
- **New component:** `InventoryOverview.tsx` (in reports feature)
- **New export function:** `exportInventoryCSV()` (client-side with data from server)

### Feature 2: EK/VK Preis-History

**What:** Track when EK or VK prices changed — shows audit trail for margin analysis
- Reason for change (e.g., "PDF import", "manual edit", "rounding fix")
- Timestamp of change
- Old → New price
- Who changed it (shop admin)

**Architectural impact:**
- **New DB table:** `price_history` (productId, shopId, oldEk, newEk, oldVk, newVk, changedAt, reason, changedBy)
- **Modified products route:** POST /products and PATCH endpoints record price changes
- **New reports calculation:** Monthly report: for each sale item, use sale-item EK snapshot (already in items JSONB), not current product.purchase_price

### Feature 3: Bestandsverlauf (Stock Movement History)

**What:** Per-product timeline showing:
- Each stock adjustment (quantity sold, returned, manually adjusted)
- Date, amount, type (sale, return, adjustment)
- Running stock balance

**Architectural impact:**
- **New DB table:** `stock_movements` (productId, shopId, delta, type, saleId, createdAt, reason)
- **Populate from sales:** Sales create stock movements automatically (on sync/creation)
- **New route:** `/api/products/:id/movements?from=...&to=...` (date-range query)
- **New component:** `StockMovementTimeline.tsx` (in product detail view)

### Feature 4: Receipt/Rechnungsexport

**What:** Export a sale (or range of sales) as printable receipt or email
- CSV with item list: name, quantity, VK-price, total
- PDF receipt format (nice printing on thermal printer)
- Email option with PDF attachment

**Architectural impact:**
- **New library:** `jsPDF` (PDF generation on client side) or server-side with `pdfkit`
- **New routes:** 
  - POST `/api/receipts/export` (generate PDF for one sale)
  - POST `/api/receipts/export-range` (CSV export of date range)
  - POST `/api/receipts/email` (send receipt to admin email)
- **New components:**
  - `ReceiptModal.tsx` (print preview)
  - `ExportRangeForm.tsx` (date picker, format chooser)
- **New utils:** `receiptFormatter.ts` (format sale items as receipt)

---

## Database Schema Changes

### New Table: `price_history`

```sql
CREATE TABLE price_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  old_purchase_price INTEGER,
  new_purchase_price INTEGER,
  old_sale_price INTEGER,
  new_sale_price INTEGER,
  change_reason TEXT NOT NULL, -- 'import', 'manual', 'system'
  changed_at BIGINT NOT NULL,
  changed_by TEXT, -- admin user name or 'system'
  created_at BIGINT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (shop_id) REFERENCES shops(id)
);

CREATE INDEX price_history_product_shop_idx ON price_history(product_id, shop_id);
CREATE INDEX price_history_changed_at_idx ON price_history(changed_at DESC);
```

**Drizzle schema:**
```typescript
export const priceHistory = pgTable('price_history', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  shopId: text('shop_id').notNull(),
  oldPurchasePrice: integer('old_purchase_price'),
  newPurchasePrice: integer('new_purchase_price'),
  oldSalePrice: integer('old_sale_price'),
  newSalePrice: integer('new_sale_price'),
  changeReason: text('change_reason').notNull(), // 'import' | 'manual' | 'system'
  changedBy: text('changed_by'), // admin name
  changedAt: bigint('changed_at', { mode: 'number' }).notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});
```

### New Table: `stock_movements`

```sql
CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  delta INTEGER NOT NULL, -- positive: stock in, negative: sold/returned
  movement_type TEXT NOT NULL, -- 'sale', 'return', 'adjustment', 'import'
  sale_id TEXT, -- reference to sales.id if from a sale
  reason TEXT, -- e.g., "inventory correction", "damage"
  created_at BIGINT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (shop_id) REFERENCES shops(id),
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);

CREATE INDEX stock_movements_product_shop_idx ON stock_movements(product_id, shop_id);
CREATE INDEX stock_movements_created_at_idx ON stock_movements(created_at DESC);
CREATE INDEX stock_movements_sale_id_idx ON stock_movements(sale_id);
```

**Drizzle schema:**
```typescript
export const stockMovements = pgTable('stock_movements', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  shopId: text('shop_id').notNull(),
  delta: integer('delta').notNull(),
  movementType: text('movement_type').notNull(), // 'sale' | 'return' | 'adjustment' | 'import'
  saleId: text('sale_id'), // nullable, references sales.id
  reason: text('reason'), // optional
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});
```

**Why these tables:**
- `price_history`: Audit trail for EK/VK changes. Necessary because monthly reports calculate cost using product snapshots in `sales.items`, not current prices. For historical accuracy, we need to know what price was used when.
- `stock_movements`: Per-product inventory timeline. Allows "when was this product sold/returned?" queries without parsing all sales. Enables stock forecasting and inventory variance detection.

---

## API Route Changes

### Existing Routes (Modified)

#### POST `/api/products` — Product Creation
**Change:** Record price change in `price_history`

```typescript
// After successful product insert:
const priceChange = {
  id: uuid(),
  productId: p.id,
  shopId: p.shopId,
  oldPurchasePrice: null,
  newPurchasePrice: p.purchasePrice,
  oldSalePrice: null,
  newSalePrice: p.salePrice,
  changeReason: 'initial',
  changedBy: session.user ?? 'api', // from session
  changedAt: Date.now(),
  createdAt: Date.now(),
};
await db.insert(priceHistory).values(priceChange);
```

#### PATCH `/api/products/:id` — Product Update
**Change:** Track EK/VK changes in price_history, create stock_movement if stock adjusted manually

```typescript
// Before update, fetch current product
const [current] = await db.select().from(products).where(eq(products.id, id)).limit(1);

// If prices changed, record in price_history
if (update.purchasePrice !== current.purchasePrice || update.salePrice !== current.salePrice) {
  const priceChange = {
    id: uuid(),
    productId: id,
    shopId: session.shopId,
    oldPurchasePrice: current.purchasePrice,
    newPurchasePrice: update.purchasePrice,
    oldSalePrice: current.salePrice,
    newSalePrice: update.salePrice,
    changeReason: update.reason ?? 'manual',
    changedBy: session.user ?? 'api',
    changedAt: Date.now(),
    createdAt: Date.now(),
  };
  await db.insert(priceHistory).values(priceChange);
}

// If stock manually adjusted, record movement
if (update.stock !== current.stock) {
  const movement = {
    id: uuid(),
    productId: id,
    shopId: session.shopId,
    delta: update.stock - current.stock,
    movementType: 'adjustment',
    reason: update.reason ?? 'manual inventory adjustment',
    createdAt: Date.now(),
  };
  await db.insert(stockMovements).values(movement);
}
```

#### POST `/api/sync` — Sale Processing
**Change:** Create stock_movement entry for each sale item

```typescript
// In SALE_COMPLETE handler, after stock update:
for (const item of sale.items) {
  const movement = {
    id: uuid(),
    productId: item.productId,
    shopId: entry.shopId,
    delta: -item.quantity, // negative = sold
    movementType: 'sale',
    saleId: sale.id,
    createdAt: sale.createdAt,
  };
  await tx.insert(stockMovements).values(movement);
}
```

### New Routes

#### GET `/api/reports/inventory?year=2026&month=3`
**Purpose:** Annual/monthly inventory snapshot

**Response:**
```typescript
interface InventoryItem {
  productId: string;
  articleNumber: string;
  name: string;
  category: string;
  currentStock: number;
  quantitySold: number;
  quantityReturned: number;
  totalRevenueCents: number;
  totalCostCents: number;
  marginCents: number;
  marginPercent: number;
  priceHistory: Array<{
    oldEk: number;
    newEk: number;
    oldVk: number;
    newVk: number;
    changedAt: number;
    reason: string;
  }>;
}

interface InventoryResponse {
  year: number;
  month?: number; // if month filter applied
  items: InventoryItem[];
  summary: {
    totalStockValue: number; // current stock * EK
    totalRevenue: number;
    totalCost: number;
    totalMargin: number;
  };
}
```

**Query logic:**
```sql
SELECT
  p.id, p.article_number, p.name, p.category,
  p.stock as current_stock,
  COALESCE(SUM(CASE WHEN sm.movement_type = 'sale' THEN -sm.delta ELSE 0 END), 0) as qty_sold,
  COALESCE(SUM(CASE WHEN sm.movement_type = 'return' THEN -sm.delta ELSE 0 END), 0) as qty_returned,
  COALESCE(SUM(CASE WHEN sm.movement_type = 'sale' THEN (SELECT COUNT(*) FROM sales s, jsonb_array_elements(s.items) as item WHERE item->>'productId' = p.id AND s.created_at >= ${periodStart} AND s.created_at < ${periodEnd}) * (item->>'salePrice')::integer ELSE 0 END), 0) as revenue_cents,
  COALESCE(SUM(CASE WHEN sm.movement_type = 'sale' THEN (SELECT COUNT(*) FROM sales s, jsonb_array_elements(s.items) as item WHERE item->>'productId' = p.id AND s.created_at >= ${periodStart} AND s.created_at < ${periodEnd}) * COALESCE(p.purchase_price, (item->>'purchasePrice')::integer) ELSE 0 END), 0) as cost_cents
FROM products p
LEFT JOIN stock_movements sm ON p.id = sm.product_id AND p.shop_id = sm.shop_id AND sm.created_at >= ${periodStart} AND sm.created_at < ${periodEnd}
WHERE p.shop_id = ${shopId}
GROUP BY p.id, p.article_number, p.name, p.category, p.stock
```

#### GET `/api/products/:id/history?from=...&to=...`
**Purpose:** Price and stock history timeline for one product

**Response:**
```typescript
interface ProductTimeline {
  productId: string;
  name: string;
  priceHistory: Array<{
    timestamp: number;
    type: 'price' | 'stock';
    oldValue: { ek: number; vk: number; stock: number };
    newValue: { ek: number; vk: number; stock: number };
    reason: string;
  }>;
}
```

#### GET `/api/products/:id/movements?from=...&to=...`
**Purpose:** Stock movement journal (for inventory reconciliation)

**Response:**
```typescript
interface StockMovement {
  id: string;
  delta: number;
  type: 'sale' | 'return' | 'adjustment' | 'import';
  saleId?: string;
  reason: string;
  createdAt: number;
}
```

#### POST `/api/receipts/export` — Single Sale Receipt
**Purpose:** Generate PDF/CSV for one sale

**Request:**
```typescript
{
  saleId: string;
  format: 'pdf' | 'csv'; // default: pdf
}
```

**Response (if format=pdf):**
```
Content-Type: application/pdf
[binary PDF data]
```

**Response (if format=csv):**
```csv
Artikel,Menge,EK,VK,Gesamt
Schokolade,2,2.50,5.00,10.00
Kaffee,1,4.00,9.00,9.00
---
Summe,,6.50,14.00,19.00
```

#### POST `/api/receipts/export-range` — Bulk Export
**Purpose:** Export multiple sales as CSV

**Request:**
```typescript
{
  from: number; // timestamp
  to: number;
  format: 'csv'; // only CSV for bulk
}
```

**Response:**
```csv
Datum,Verkauf-ID,Artikel,Menge,VK,Gesamt,Marge
2026-04-01,sale-123,Schokolade,2,5.00,10.00,5.00
2026-04-01,sale-123,Kaffee,1,9.00,9.00,5.00
...
```

#### POST `/api/receipts/email` — Send Receipt
**Purpose:** Email receipt to admin

**Request:**
```typescript
{
  saleId: string;
  recipientEmail: string; // admin email
}
```

**Response:**
```typescript
{ ok: true; message: "Receipt sent to admin@church.de" }
```

---

## Frontend Component Structure

### New Components (v8.0)

```
client/src/features/admin/
├── reports/
│   ├── MonthlyReport.tsx (existing)
│   ├── ReportChart.tsx (existing)
│   ├── InventoryOverview.tsx (NEW)
│   │   ├─ Fetch /api/reports/inventory
│   │   ├─ Table: products with stock, sales, margin
│   │   ├─ Filter by category, stock level, margin
│   │   └─ Export button → CSV download
│   │
│   └── SaleDetailModal.tsx (MODIFIED)
│       ├─ Add: "Print Receipt" button → ReceiptModal
│       ├─ Add: Price-change callout if product price changed since sale
│       └─ Existing: Storno, Rückgabe buttons
│
├── products/
│   ├── ProductList.tsx (existing)
│   ├── ProductForm.tsx (existing)
│   │
│   └── ProductHistoryPanel.tsx (NEW)
│       ├─ Tab: "Preis-Geschichte" (price_history)
│       ├─ Tab: "Bestandsverlauf" (stock_movements)
│       ├─ Timeline view
│       └─ Date range filter
│
└── receipts/
    ├── ReceiptModal.tsx (NEW)
    │   ├─ Print preview (HTML)
    │   ├─ PDF download button
    │   ├─ Email button → ReceiptEmailForm
    │   └─ Styled for thermal printer (80mm width)
    │
    ├── ReceiptEmailForm.tsx (NEW)
    │   ├─ Email input (pre-filled with settings.adminEmail)
    │   └─ Send button
    │
    └── ExportRangeForm.tsx (NEW)
        ├─ Date-from, Date-to pickers
        ├─ Format chooser (CSV only for now)
        └─ Download button → GET /api/receipts/export-range
```

### Modified Components

#### `SaleDetailModal.tsx`
**Changes:**
- Add "Receipt" button (opens ReceiptModal)
- Add note if product's current price differs from sale price: "Preis war damals: 5,00€ (jetzt: 6,00€)"
- Query product price history to show context

#### `DailyReport.tsx`
**Changes:**
- Add "Export Range" button → ExportRangeForm
- Allow date-range export to CSV

#### `ProductList.tsx`
**Changes:**
- Add "History" button per product → ProductHistoryPanel
- Show indicator if price changed in last 30 days

### Hooks (New)

```typescript
// client/src/features/admin/hooks/useInventoryReport.ts
export function useInventoryReport(year: number, month?: number) {
  const query = useQuery({
    queryKey: ['inventory', year, month],
    queryFn: () => authFetch(`/api/reports/inventory?year=${year}&month=${month}`).then(r => r.json()),
    enabled: navigator.onLine,
  });
  return query;
}

// client/src/features/admin/hooks/useProductHistory.ts
export function useProductHistory(productId: string, from?: number, to?: number) {
  const query = useQuery({
    queryKey: ['product-history', productId, from, to],
    queryFn: () => {
      const params = new URLSearchParams({ from, to });
      return authFetch(`/api/products/${productId}/history?${params}`).then(r => r.json());
    },
  });
  return query;
}

// client/src/features/admin/hooks/useStockMovements.ts
export function useStockMovements(productId: string, from?: number, to?: number) {
  const query = useQuery({
    queryKey: ['stock-movements', productId, from, to],
    queryFn: () => {
      const params = new URLSearchParams({ from, to });
      return authFetch(`/api/products/${productId}/movements?${params}`).then(r => r.json());
    },
  });
  return query;
}
```

---

## Integration Points: v8.0 ↔ Existing Systems

### 1. Sale Creation Flow (Existing → New)

```
Client: useCheckout() → POST /api/sync with SALE_COMPLETE
   ↓
Server: POST /api/sync handler
   ├─ Insert sale into sales table (existing)
   ├─ Update products.stock (existing)
   ├─ Insert stock_movement entries (NEW)
   └─ Broadcast 'products_changed' (existing)
```

**No changes to client checkout flow.** Stock movements created automatically server-side.

### 2. Product Update Flow (Existing → New)

```
Client: ProductForm → POST/PATCH /api/products
   ↓
Server: POST /api/products handler
   ├─ Validate & upsert product (existing)
   ├─ Detect price changes (NEW)
   │  └─ If EK or VK changed: insert price_history row
   ├─ Detect stock adjustments (NEW)
   │  └─ If stock manually edited: insert stock_movement row
   └─ Broadcast 'products_changed' (existing)
```

**Client change:** ProductForm needs optional `reason` field for manual stock adjustments (for audit trail).

### 3. PDF Import Flow (Existing → New)

```
Client: POST /api/import with PDF
   ↓
Server: PDF parsing handler
   ├─ Parse PDF into items (existing, pdfjs-dist)
   ├─ For each item, check if product exists or create (existing)
   │  ├─ If new: insert product + price_history('import')
   │  └─ If exists with price change: update + price_history('import')
   └─ Return parsed items for review (existing)
```

**Server change:** PDF import must record price changes in price_history with reason='import'.

### 4. Reports Flow (Existing → New)

```
Client: MonthlyReport → GET /api/reports/monthly
   ↓
Server: POST /api/reports/monthly handler (existing)
   ├─ Calculate revenue from sales (existing)
   ├─ Calculate cost from sales.items snapshots (existing)
   │  └─ Use (item.purchasePrice) from JSONB, not current product.purchase_price
   └─ Return summary (existing)

Client: InventoryOverview (NEW) → GET /api/reports/inventory
   ↓
Server: NEW endpoint
   ├─ Query products + stock_movements + price_history
   ├─ Aggregate stock changes, price history per product
   └─ Return structured inventory data
```

**No breaking changes.** Monthly report logic unchanged. New endpoint alongside existing.

### 5. WebSocket Broadcasts (Existing → New)

```
Existing broadcast on product change:
  { type: 'products_changed', shopId }

This still works for:
  - Price changes (clients reload products list)
  - Stock updates (reflected in real-time)

NEW: No additional broadcasts needed — price_history/stock_movements are query-based (not real-time critical).
```

---

## Data Flow Diagrams

### Flow A: Rechnungsimport → Price History

```
User uploads PDF (Südnord-Kontor invoice)
    ↓
POST /api/import with file buffer
    ↓
Server: pdfjs-dist parses PDF
    ├─ Extract items: [{ articleNumber, name, quantity, ek, vk }, ...]
    ↓
For each item:
    ├─ SELECT product WHERE article_number = ? AND shop_id = ?
    ├─ If exists:
    │  ├─ Compare product.purchasePrice vs. parsed EK
    │  └─ If changed: INSERT price_history(reason='import')
    ├─ If not exists:
    │  ├─ INSERT product (new) with EK/VK from PDF
    │  └─ INSERT price_history(reason='import')
    └─ Both cases: return item in response for user review
    ↓
Client: ShowPreview of parsed items
    ├─ Highlight new products, price changes
    └─ User clicks "Freigeben"
    ↓
POST /api/import/confirm with approved item IDs
    ↓
Server: Insert/update products, adjust stock
    └─ Return OK
```

### Flow B: Annual Inventory Report

```
User clicks "Jahresbericht 2026" → InventoryOverview
    ↓
GET /api/reports/inventory?year=2026
    ↓
Server query:
    SELECT
      p.id, p.name, p.article_number, p.stock,
      SUM(sm.delta) as movement_total,
      SUM(CASE WHEN sm.type = 'sale' THEN -sm.delta ELSE 0 END) as qty_sold,
      (SELECT revenue from sales calculation) as total_revenue,
      (SELECT cost calculation using snapshots) as total_cost
    FROM products p
    LEFT JOIN stock_movements sm ON p.id = sm.product_id
    LEFT JOIN sales s ON ...
    LEFT JOIN price_history ph ON p.id = ph.product_id
    WHERE p.shop_id = ? AND (sale/movement created in 2026)
    GROUP BY p.id
    ↓
Client: Render table
    ├─ Columns: Artikel, Bestand, Verkauft, Umsatz, Kosten, Marge
    ├─ Sortable, filterable
    └─ Export CSV button → GET /api/reports/inventory?export=csv
```

### Flow C: Product Price History Detail View

```
User opens product detail → ProductHistoryPanel
    ↓
GET /api/products/:id/history?from=2026-01-01&to=2026-12-31
    ↓
Server:
    SELECT * FROM price_history WHERE product_id = ? ORDER BY changed_at DESC
    SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC
    ↓
Merge & sort by timestamp
    ↓
Client: Timeline view
    ├─ 2026-04-01: VK changed 5,00€ → 5,50€ (reason: "manual")
    ├─ 2026-03-15: Stock +10 (import from PDF)
    ├─ 2026-03-10: Stock -2 (sale to customer)
    └─ ...
```

---

## New vs. Modified Components: Summary

### New (v8.0)

| Component/File | Type | Purpose |
|---|---|---|
| `server/src/db/schema.ts` additions | DB | `priceHistory`, `stockMovements` tables |
| `server/src/routes/inventory.ts` | Route | GET /api/reports/inventory |
| `server/src/routes/products.ts` modifications | Route | Track price changes, stock adjustments |
| `server/src/routes/receipts.ts` | Route | POST /api/receipts/* endpoints |
| `client/src/features/admin/reports/InventoryOverview.tsx` | Component | Inventory snapshot view |
| `client/src/features/admin/products/ProductHistoryPanel.tsx` | Component | Timeline: price & stock history |
| `client/src/features/admin/receipts/ReceiptModal.tsx` | Component | Print-friendly receipt view |
| `client/src/features/admin/receipts/ExportRangeForm.tsx` | Component | Date-range export dialog |
| `client/src/features/admin/hooks/useInventoryReport.ts` | Hook | TanStack Query for inventory data |
| `client/src/features/admin/hooks/useProductHistory.ts` | Hook | TanStack Query for price/stock history |
| `client/src/utils/receiptFormatter.ts` | Util | Receipt HTML generation |

### Modified (v8.0)

| Component/File | Changes |
|---|---|
| `server/src/routes/products.ts` | On PATCH: detect price changes → insert price_history; detect stock adjustment → insert stock_movement |
| `server/src/routes/sync.ts` | On SALE_COMPLETE: create stock_movement entries for each item sold |
| `server/src/routes/import.ts` | On PDF import: record price changes in price_history with reason='import' |
| `client/src/features/admin/reports/SaleDetailModal.tsx` | Add ReceiptModal button; show price-change note if applicable |
| `client/src/features/admin/products/ProductList.tsx` | Add "History" button → ProductHistoryPanel |
| `client/src/features/admin/reports/DailyReport.tsx` | Add "Export Range" button → ExportRangeForm |

---

## Build Order Considerations

### Dependency Graph

```
Phase 1: Database & Models
├─ Add price_history table (Drizzle migration)
└─ Add stock_movements table (Drizzle migration)

Phase 2: Core Server Routes (dependency: Phase 1)
├─ Inventory report endpoint: GET /api/reports/inventory
├─ Modify POST /api/products: record price changes
├─ Modify PATCH /api/products: record price changes + stock adjustments
├─ Modify POST /api/sync: create stock_movements
└─ Modify POST /api/import: record price changes on PDF import

Phase 3: Receipt Export Routes (no dependency)
├─ POST /api/receipts/export (single sale as PDF/CSV)
├─ POST /api/receipts/export-range (bulk CSV)
└─ POST /api/receipts/email (Nodemailer integration)

Phase 4: Frontend Components (dependency: Phase 2)
├─ InventoryOverview component + useInventoryReport hook
├─ ProductHistoryPanel component + useProductHistory, useStockMovements hooks
├─ SaleDetailModal: Add receipt button (uses Phase 3 routes)
├─ ProductList: Add history button (uses Phase 4 component)
└─ DailyReport: Add export-range button

Phase 5: Polish & Testing
├─ CSV export formatting and header localization
├─ PDF receipt styling for thermal printer (80mm)
├─ Date-range picker accessibility
└─ End-to-end tests for price change → inventory calculation
```

### Why This Order

1. **Database first:** All downstream routes depend on tables existing
2. **Server routes before frontend:** Components need API endpoints to exist
3. **Receipt routes independent:** Can be developed in parallel with core routes
4. **Frontend last:** Components can be built once APIs are stable
5. **Polish at end:** Formatting, localization, accessibility after core functionality

---

## Risk Mitigation

### Risk 1: Price History Query Performance

**Problem:** `price_history` table could grow large (one row per price change per product). Joining with sales for "cost_cents" calculation expensive.

**Mitigation:**
- Index on `(product_id, shop_id, changed_at DESC)`
- For monthly reports, use `sales.items` snapshots (already in JSONB), not live `product.purchase_price`
- For inventory report: aggregate stock_movements by product, not by sale
- Limit price history to 1-year window by default

### Risk 2: Stock Movement Bulk Creation

**Problem:** PDF import with 30+ articles creates 30+ stock_movement rows at once.

**Mitigation:**
- Batch insert: `INSERT INTO stock_movements VALUES (...), (...), ... `
- Index on `(product_id, shop_id)` for quick lookups
- Stock movements are non-critical (inventory reads, not real-time), so no transaction required

### Risk 3: Receipt PDF Generation

**Problem:** Server-side PDF generation with pdfkit adds dependency; client-side with jsPDF creates large payload.

**Mitigation:**
- Start with **client-side jsPDF** for simplicity (already using Tailwind for styling)
- Use HTML-to-PDF via `html2pdf.js` library (small, lightweight)
- If performance issues: move to server-side pdfkit later
- For thermal printer: use `@react-pdf/renderer` for styled PDF output

### Risk 4: Inventory Report Complexity

**Problem:** Aggregating price history + stock movements + sales snapshots in one query is complex SQL.

**Mitigation:**
- Build query incrementally:
  1. Test stock_movements sum separately
  2. Test price_history join separately
  3. Combine only when each part works
- Use views or stored procedures if SQL gets too complex
- Cache results if endpoint called frequently

---

## Testing Strategy

### Unit Tests (Vitest)

- `receiptFormatter.ts`: format sale items → CSV/HTML
- Price change detection logic in products route
- Stock movement creation in sync route

### Integration Tests (Playwright)

- PDF import → price_history created with reason='import'
- Manual product edit → price_history entry created
- Monthly report: cost_cents calculated from sale snapshots, not current price
- Inventory report: shows correct stock balance after sales + returns

### Manual Testing (QA)

- PDF import with 5 articles, 2 with price changes → verify price_history table
- Sell 3 units of product A → verify stock_movements shows delta=-3
- Return 1 unit → verify stock_movements shows delta=+1
- Export receipt as PDF → verify format on thermal printer width
- Inventory report → compare manual stock count vs. system total

---

## Comparison with Alternative Approaches

### Alternative A: Audit Log (Single Table)

Store all changes (price, stock, sales) in one `audit_log` table.

**Pros:**
- Single source of truth for all history
- Easier to reason about

**Cons:**
- Mixing concerns (prices, stock, sales all jumbled)
- Slower to query "all price changes for product X"
- Need to filter by operation_type in every query

**Recommendation:** Use separate tables (`price_history`, `stock_movements`). Clearer semantics, faster queries.

### Alternative B: Event Sourcing

Store immutable events (PriceChangedEvent, SaleCreatedEvent, etc.) and rebuild state on read.

**Pros:**
- Full audit trail, no data loss
- Temporal queries easy ("what was stock on 2026-03-15?")

**Cons:**
- Significant complexity for this use case
- Requires event replay on every inventory read
- Overkill for a single-shop POS system

**Recommendation:** Stick with event results in tables. Event sourcing is for multi-tenant, highly-audited systems.

### Alternative C: Track Prices in Sales Items Only

Don't add `price_history` table. Use sale.items snapshots to calculate historical costs.

**Pros:**
- No new table
- Data is already there in JSONB

**Cons:**
- Can't answer "when did this product's list price change?"
- Mixing sale data with product metadata
- Harder to audit manual price edits vs. imports

**Recommendation:** Add `price_history` table. It's explicit, queryable, and auditable.

---

## Compatibility & Migration

### v7.0 → v8.0 Migration

**Database:**
- Add `price_history` and `stock_movements` tables
- Drizzle migration script:
  ```typescript
  // migrations/add_price_history.ts
  await db.schema.createTable('price_history').columns({ ... }).execute();
  
  // migrations/add_stock_movements.ts
  await db.schema.createTable('stock_movements').columns({ ... }).execute();
  
  // Backfill stock_movements from existing sales (one-time):
  // For each sale, create stock_movement entry with delta = -quantity
  ```

**Server Routes:**
- Backward compatible: old endpoints unchanged
- New endpoints alongside existing
- Old clients still work (no breaking changes)

**Client:**
- New components don't affect existing routes
- WebSocket broadcasts unchanged
- TanStack Query queries unchanged

---

## Conclusion

**v8.0 architecture integrates cleanly with v7.0:**

1. **Minimal schema changes:** Two new tables, non-breaking
2. **Route changes are additive:** Record price/stock changes on existing mutations, add new endpoints
3. **Frontend expansion:** New components and hooks, existing flows untouched
4. **Build order is clear:** Database → Routes → Components
5. **No architectural debt:** Follows v7.0 patterns (Drizzle, TanStack Query, WebSocket)

The three v8.0 features (Inventur, Preis-History, Rechnungsexport) can be built in parallel phases, with database migrations in Phase 1 unblocking all downstream work.

---

**Researched:** 2026-04-01
**Confidence:** HIGH — based on existing v7.0 codebase audit, Drizzle ORM experience, PostgreSQL best practices
