# Architecture Patterns: v8.0 Milestone (Price History, Inventory Reports, Receipt Export)

**Milestone:** v8.0 — Inventur, Preis-History & Rechnungsexport
**Researched:** 2026-04-01
**Focus:** Database schema design patterns and data flow architecture

---

## Recommended Architecture

### Data Model Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  CURRENT STATE (v7.0)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  products (id, name, price_vk, price_ek, active, ...)          │
│      ↓                                                            │
│  sales (id, shop_id, total_cents, created_at, cancelled_at)    │
│      ↓                                                            │
│  sales_items (id, sale_id, product_id, quantity)               │
│                                                                   │
│  withdrawals (id, shop_id, reason, created_at)                 │
│  withdrawal_items (id, withdrawal_id, product_id, quantity)    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PROPOSED v8.0 ADDITION (Price History & Snapshots)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  products_price_history (id, product_id, price_vk_cents,        │
│                          price_ek_cents, changed_at, changed_by)│
│      ↑ (TRIGGER on products UPDATE)                             │
│                                                                   │
│  sales_items → ADD:                                             │
│    - price_vk_cents (snapshot at sale time)                     │
│    - price_ek_cents (snapshot at sale time)                     │
│    - product_name (snapshot, optional but recommended)          │
│    - product_category (snapshot, optional but recommended)      │
│                                                                   │
│  product_receipts (id, product_id, quantity_received,           │
│                    receipt_date, supplier_batch_id)             │
│                                                                   │
│  inventory_adjustments (id, product_id, quantity_delta,         │
│                         reason, created_at)                     │
│      [reason = 'damaged' | 'theft' | 'correction' | ...]        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  REPORTING LAYER (Queries that build on snapshots)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  VIEW: inventory_transactions_all                               │
│    → UNION of sales_items(-qty), receipts(+qty),                │
│      adjustments(±qty), withdrawals(-qty)                       │
│    → Used for stock-at-date calculations                        │
│                                                                   │
│  VIEW: price_as_of(product_id, timestamp)                       │
│    → Returns effective price from products_price_history        │
│    → Used for cost reconciliation reports                       │
│                                                                   │
│  COMPUTED: inventory_valuations (materialized if needed)        │
│    → quantity_remaining * price_ek_cents (per product)          │
│    → Pre-computed at transaction time to prevent rounding       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `sales_items` (updated) | Records individual article transactions with price snapshots | `sales` (FK), `products` (for validation only, not reporting) |
| `products_price_history` | Audit log of all price changes with timestamps | `products` (via trigger), reporting queries |
| `product_receipts` | Supplier stock deliveries with received quantities | `products` (for validation), reporting queries |
| `inventory_adjustments` | Damage/theft/correction adjustments to stock | `products` (for validation), reporting queries |
| `inventory_transactions_all` (view) | Unified transaction history for stock calculations | All transaction tables above |
| `price_as_of()` function | Point-in-time price lookups (used in historical reports) | `products_price_history`, reporting queries |

---

## Data Flow Patterns

### Pattern 1: Price Snapshot at Sale Time

**What:** When a sale is completed, the product's current price is stored in `sales_items`.

**When:** During POST `/api/sales` (checkout completion)

**Example flow:**
```typescript
// Fastify route handler
async function completeSale(request: FastifyRequest, reply: FastifyReply) {
  const { cartItems, amountPaid, shop_id } = request.body;

  // 1. Fetch current products (to validate they exist and get snapshots)
  const products = await db.select().from(products_table)
    .where(inArray(products_table.id, cartItems.map(i => i.product_id)));

  // 2. Create sale header
  const sale = await db.insert(sales_table).values({
    shop_id,
    total_cents: calculateTotal(cartItems, products),
    created_at: new Date(),
  }).returning();

  // 3. Insert sales_items with SNAPSHOTS
  const items = cartItems.map(cartItem => {
    const product = products.find(p => p.id === cartItem.product_id);
    return {
      sale_id: sale.id,
      product_id: cartItem.product_id,
      quantity: cartItem.quantity,
      price_vk_cents: product.price_vk_cents,  // ← SNAPSHOT
      price_ek_cents: product.price_ek_cents,  // ← SNAPSHOT
      product_name: product.name,              // ← OPTIONAL snapshot
      product_category: product.category,      // ← OPTIONAL snapshot
    };
  });

  await db.insert(sales_items_table).values(items);

  // 4. Decrement product stock
  await db.update(products_table)
    .set({ stock_quantity: sql`${products_table.stock_quantity} - ${cartItem.quantity}` })
    .where(eq(products_table.id, cartItem.product_id));

  // 5. Calculate change
  const changeAmount = calculateChange(amountPaid, sale.total_cents);
  return { saleId: sale.id, changeAmount };
}
```

**Invariant:** Every row in `sales_items` must have `price_vk_cents` and `price_ek_cents` populated. NULL checks at INSERT time.

---

### Pattern 2: Price History Trigger (Audit Trail)

**What:** Whenever a product's price changes, the trigger logs the new price to `products_price_history`.

**When:** After product price update (admin endpoint)

**Example flow:**
```sql
-- Trigger definition (note: WHEN clause prevents no-op updates)
CREATE OR REPLACE FUNCTION log_product_price_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO products_price_history (
    product_id, 
    price_vk_cents, 
    price_ek_cents, 
    changed_by,
    changed_at
  )
  VALUES (
    NEW.id, 
    NEW.price_vk * 100, 
    NEW.price_ek * 100,
    COALESCE(current_user, 'system'),
    CURRENT_TIMESTAMP
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_price_history_trigger
AFTER UPDATE ON products
FOR EACH ROW
WHEN (OLD.price_vk IS DISTINCT FROM NEW.price_vk 
   OR OLD.price_ek IS DISTINCT FROM NEW.price_ek)
EXECUTE FUNCTION log_product_price_change();
```

**Invariant:** `products_price_history` has millisecond-precision timestamps; queries can handle same-day price changes.

---

### Pattern 3: Unified Stock Calculation (Multiple Transaction Types)

**What:** Stock at any point in time is the sum of all transactions (sales, receipts, adjustments, withdrawals) up to that point.

**When:** Historical reporting (year-end inventory, stock-on-date queries)

**Example view:**
```sql
CREATE VIEW inventory_transactions_all AS
  SELECT 
    product_id,
    created_at,
    -quantity AS quantity_delta,  -- negative for sales
    'sale' AS transaction_type,
    sales_items.id as transaction_id
  FROM sales_items
  JOIN sales ON sales_items.sale_id = sales.id
  WHERE sales.cancelled_at IS NULL  -- exclude stornoes
  
  UNION ALL
  
  SELECT 
    product_id,
    receipt_date AS created_at,
    quantity_received AS quantity_delta,  -- positive for receipts
    'receipt' AS transaction_type,
    product_receipts.id
  FROM product_receipts
  
  UNION ALL
  
  SELECT 
    product_id,
    created_at,
    quantity_delta,  -- can be ± for adjustments
    CONCAT('adjustment_', reason) AS transaction_type,
    inventory_adjustments.id
  FROM inventory_adjustments
  
  UNION ALL
  
  SELECT 
    product_id,
    created_at,
    -quantity AS quantity_delta,  -- negative for withdrawals
    'withdrawal' AS transaction_type,
    withdrawal_items.id
  FROM withdrawal_items
  JOIN withdrawals ON withdrawal_items.withdrawal_id = withdrawals.id
  
ORDER BY product_id, created_at;
```

**Stock-at-date query:**
```sql
SELECT 
  product_id, 
  SUM(quantity_delta) as stock_on_date
FROM inventory_transactions_all
WHERE created_at < $1::DATE  -- at start of date
GROUP BY product_id;
```

**Invariant:** Query returns identical results whether run daily or monthly (cumulative sums).

---

### Pattern 4: Rounding-Safe Inventory Valuation

**What:** Instead of computing inventory value at report time, pre-compute it when stock changes.

**When:** After each transaction (sale, receipt, adjustment)

**Example (in Fastify route):**
```typescript
async function recordSaleAndUpdateValuation(saleData) {
  // 1. Record sale
  const sale = await db.insert(sales_table).values(saleData).returning();

  // 2. For each item sold, update pre-computed valuation
  for (const item of saleData.items) {
    const product = await db.select().from(products_table)
      .where(eq(products_table.id, item.product_id));
    
    // Calculate remaining quantity
    const remainingQuantity = product.stock_quantity - item.quantity;
    
    // Pre-compute inventory value (no rounding at report time)
    const inventoryValueCents = remainingQuantity * product.price_ek_cents;
    
    await db.update(products_table)
      .set({ 
        stock_quantity: remainingQuantity,
        inventory_value_cents: inventoryValueCents,  // ← stored, not computed
        last_inventory_update: sql`NOW()`
      })
      .where(eq(products_table.id, item.product_id));
  }
}
```

**Inventory report (no rounding, just sums):**
```sql
SELECT 
  SUM(inventory_value_cents) / 100.0 as total_inventory_value_euro
FROM products
WHERE active = true;
```

**Invariant:** `inventory_value_cents` is always `quantity_on_hand * price_ek_cents` (computed synchronously at transaction time).

---

### Pattern 5: Receipt Export (PDF/CSV with Snapshots)

**What:** Export a sale as PDF/CSV, including product name, price, quantity, and cancellation status.

**When:** On-demand (user clicks export) or batch (monthly CSV for accounting)

**Example SQL:**
```sql
SELECT 
  s.id as sale_id,
  s.created_at,
  s.cancelled_at,  -- ← included to note cancellation
  si.quantity,
  si.price_vk_cents,
  si.price_ek_cents,
  si.product_name,  -- ← snapshot, not join to products
  si.product_category,
  si.quantity * si.price_vk_cents as line_total_cents
FROM sales s
JOIN sales_items si ON s.id = si.sale_id
WHERE s.id = $1
ORDER BY si.created_at;
```

**PDF generation (Fastify + pdfjs or similar):**
```typescript
async function generateReceiptPDF(saleId: string): Promise<Buffer> {
  const sale = await fetchSaleWithItems(saleId);

  const pdfDoc = new PDFDocument();
  
  // Header
  pdfDoc.fontSize(14).text('Fairstand Kassensystem', { align: 'center' });
  pdfDoc.fontSize(10).text(`Beleg: ${sale.id}`);
  pdfDoc.text(`Datum: ${formatDate(sale.created_at)}`);
  
  // Check cancellation
  if (sale.cancelled_at) {
    pdfDoc.fillColor('red').fontSize(12)
      .text(`⚠️ STORNIERT am ${formatDate(sale.cancelled_at)}`);
    pdfDoc.fillColor('black');
  }
  
  // Line items
  sale.items.forEach(item => {
    pdfDoc.fontSize(10).text(
      `${item.product_name}: ${item.quantity} x €${(item.price_vk_cents / 100).toFixed(2)}`,
      { align: 'left' }
    );
  });
  
  // Total
  pdfDoc.fontSize(12).text(
    `Gesamtbetrag: €${(calculateTotal(sale.items) / 100).toFixed(2)}`,
    { align: 'right' }
  );
  
  return pdfDoc.getBuffer();
}
```

**Invariant:** Receipt PDF/CSV uses only snapshot data from `sales_items`, never joins to current `products` table.

---

### Pattern 6: Year-End Inventory Report

**What:** For each product, show quantity on hand, total sold, total revenue, total cost, and margin.

**When:** Monthly/annual reporting

**Example query:**
```sql
SELECT 
  p.id,
  p.name,
  p.category,
  p.active,
  -- Current stock
  p.stock_quantity,
  -- Inventory value at current prices
  p.inventory_value_cents / 100.0 as inventory_value_euro,
  -- All-time sales
  COUNT(DISTINCT si.sale_id) as sales_count,
  SUM(si.quantity) as units_sold,
  SUM(si.quantity * si.price_vk_cents) / 100.0 as revenue_euro,
  SUM(si.quantity * si.price_ek_cents) / 100.0 as cost_euro,
  -- Margin
  (
    SUM(si.quantity * si.price_vk_cents) - 
    SUM(si.quantity * si.price_ek_cents)
  ) / 100.0 as margin_euro,
  -- Price history (for cost analysis)
  MIN(sph.price_ek_cents) / 100.0 as min_cost_paid,
  MAX(sph.price_ek_cents) / 100.0 as max_cost_paid
FROM products p
LEFT JOIN sales_items si ON p.id = si.product_id
LEFT JOIN sales s ON si.sale_id = s.id AND s.cancelled_at IS NULL
LEFT JOIN (
  -- Subquery: distinct EK prices this product was ever bought at
  SELECT DISTINCT product_id, price_ek_cents
  FROM products_price_history
) sph ON p.id = sph.product_id
WHERE p.active = true  -- only active products (or separate them)
GROUP BY p.id, p.name, p.category, p.active, p.stock_quantity, p.inventory_value_cents
ORDER BY p.category, p.name;
```

**Invariant:** Includes deactivated products in a separate section (WHERE active = false).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Querying `products.price_vk` in Historical Reports

**What:** Using `JOIN products p ON si.product_id = p.id` and selecting `p.price_vk` in a historical report.

**Why bad:** Price changes retroactively affect all historical sales reports (snapshot staleness).

**Instead:** Always use `si.price_vk_cents` from `sales_items`.

```sql
-- ❌ WRONG: uses current product price
SELECT si.quantity, p.price_vk FROM sales_items si
JOIN products p ON si.product_id = p.id;

-- ✅ CORRECT: uses snapshot price
SELECT si.quantity, si.price_vk_cents FROM sales_items si;
```

---

### Anti-Pattern 2: Computing Inventory Value at Query Time

**What:** Writing `SELECT SUM(quantity * price_ek / 100) FROM products` in a report.

**Why bad:** Rounding errors accumulate; difficult to debug; slows down large reports.

**Instead:** Pre-compute `inventory_value_cents` at transaction time and store it.

```sql
-- ❌ WRONG: rounding at query time
SELECT 
  SUM(stock_quantity * price_ek) / 100 as inventory_value
FROM products;

-- ✅ CORRECT: uses pre-computed value
SELECT 
  SUM(inventory_value_cents) / 100.0 as inventory_value
FROM products;
```

---

### Anti-Pattern 3: Using DATE Instead of TIMESTAMP WITH TIME ZONE

**What:** Storing price-change times or transaction times as `DATE` type.

**Why bad:** Loses intra-day resolution; can't distinguish same-day price changes; timezone ambiguity.

**Instead:** Always use `TIMESTAMP WITH TIME ZONE`.

```sql
-- ❌ WRONG: no intra-day precision
CREATE TABLE products_price_history (
  changed_at DATE
);

-- ✅ CORRECT: millisecond precision + timezone
CREATE TABLE products_price_history (
  changed_at TIMESTAMP WITH TIME ZONE
);
```

---

### Anti-Pattern 4: No Cancellation Tracking in Receipt Exports

**What:** Exporting a receipt without checking `sales.cancelled_at`.

**Why bad:** Exported receipt shows original sale amount even if later stornoed; audit trail incomplete.

**Instead:** Always include `cancelled_at` status in PDF/CSV.

```sql
-- ❌ WRONG: ignores cancellation
SELECT * FROM sales_items WHERE sale_id = $1;

-- ✅ CORRECT: includes cancellation context
SELECT 
  si.*,
  s.cancelled_at
FROM sales_items si
JOIN sales s ON si.sale_id = s.id
WHERE s.id = $1;
```

---

### Anti-Pattern 5: Filtering Active Products in Inventory Reports

**What:** Writing `WHERE active = true` in a year-end inventory report, excluding deactivated products.

**Why bad:** Year-end inventory audit is incomplete; deactivated products' historical sales disappear from reports.

**Instead:** Include deactivated products, mark with `[DEACTIVATED]` label.

```sql
-- ❌ WRONG: deactivated products excluded
SELECT * FROM products WHERE active = true;

-- ✅ CORRECT: includes deactivated, marked
SELECT 
  *,
  CASE WHEN active = false THEN '[DEACTIVATED]' ELSE '' END as status_label
FROM products
ORDER BY active DESC, name;
```

---

## Scalability Considerations

| Concern | At 50 products | At 200 products | At 1000+ products |
|---------|----------------|-----------------|-------------------|
| Stock calculation | Single SUM query <10ms | Single SUM query <50ms | Consider materialized view if >500ms |
| Price history queries | <5000 rows, seq scan OK | <20k rows, add index | >100k rows, partition by year or archive old data |
| Receipt export (single sale) | <50ms (few items) | <100ms (10-20 items) | Still <200ms (indexes required) |
| Year-end report generation | <1s | <2s | <5s (consider materialized snapshot) |

**Mitigation strategies:**
- **500-1000 products:** Add indexes on `products_price_history(product_id, changed_at DESC)`
- **>100k price history rows:** Partition table by `YEAR(changed_at)` or archive to cold storage
- **>10k sales:** Use materialized view for year-end report, refresh monthly

---

## Integration with Existing Architecture

**Current Fairstand architecture:**
- PostgreSQL 16 + Drizzle ORM
- Fastify 5 backend with WebSocket live updates
- TanStack Query frontend (server-side data, no local cache)
- Multi-shop with `shopId` row-level isolation

**v8.0 additions fit seamlessly because:**
1. **Drizzle ORM already supports migrations** — schema changes (new columns, triggers, views) are version-controlled
2. **Fastify routes can add snapshots** — no additional dependencies
3. **PostgreSQL triggers are production-grade** — no new infrastructure
4. **Views and computed columns are standard** — TanStack Query can query them like any table

**No architectural changes needed** — v8.0 is purely schema-level extension.

---

## Sources

- [PostgreSQL Trigger Best Practices](https://www.enterprisedb.com/postgres-tutorials/working-postgres-audit-triggers) — Trigger WHEN clauses (HIGH confidence, EDB)
- [Row-level Audit Patterns in PostgreSQL](https://www.cybertec-postgresql.com/en/row-change-auditing-options-for-postgresql/) — Multiple approaches to audit tables (MEDIUM confidence)
- [Database Design for Audit Logging](https://www.red-gate.com/blog/database-design-for-audit-logging) — Snapshot vs live data patterns (MEDIUM confidence)
- [Handling Historical Data in SQL](https://www.red-gate.com/blog/database/temporal-tables-and-point-in-time-queries) — Point-in-time query patterns (MEDIUM confidence)

---

*Last updated: 2026-04-01 for v8.0 milestone*
