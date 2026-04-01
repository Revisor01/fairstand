# Domain Pitfalls: Price History, Inventory Reports & Receipt Export

**Milestone:** v8.0 — Inventur, Preis-History & Rechnungsexport
**Researched:** 2026-04-01
**Focus:** Common mistakes when adding price tracking, inventory calculations, and receipt export to existing POS system
**Overall confidence:** MEDIUM (WebSearch + industry patterns, partially verified)

---

## Critical Pitfalls

Mistakes that cause data corruption, reporting errors, or system rewrites.

### Pitfall 1: Snapshot Staleness — Using Live Product Data Instead of Sale-Time Prices

**What goes wrong:**
When you export historical sales reports 6 months later and query `products.price_vk` to fill in historical figures, the price is now different from when the sale happened. Monthly reports show wrong margins, cost-of-goods (EK) becomes incorrect retroactively, and inventory valuations become nonsensical.

**Why it happens:**
The convenience of joining `sales` → `products` is tempting. Early implementations store only `product_id` + `quantity` in the `sales_items` table. When EK price changes from €0.80 to €0.95, all historical sales suddenly show the new cost, making year-to-date margin reports jump unexpectedly.

**Consequences:**
- Monthly margin reports are non-auditable (same sale shows different cost if regenerated after price change)
- Inventory valuation reports become unreliable for financial records
- Discovering discrepancies months later forces retroactive corrections
- Rechnungsexport (receipt export) for same sale shows different line-item cost depending on when exported
- Audit trail breaks: "Why did Q2 margin change in October?" becomes unanswerable

**Prevention:**
- Store price snapshot in `sales_items` at sale time: `price_vk_cents`, `price_ek_cents` (both as integer)
- Make `products.price_vk` a current reference only, never use it in historical reports
- Add migration: populate `price_vk_cents`, `price_ek_cents` in existing `sales_items` from current `products` values (document as "migrated snapshot")
- In all reporting queries: `JOIN sales_items.price_vk_cents`, never `JOIN products.price_vk`
- For monthly variance analysis: compare current product EK vs oldest `sales_items.price_ek_cents` to show actual price impact

**Detection:**
- Run: `SELECT product_id, COUNT(DISTINCT price_vk_cents) FROM sales_items GROUP BY product_id HAVING COUNT(*) > 1` — each product should show at most N distinct prices (one per actual price change)
- Monthly report regeneration shows different totals than previously exported version for same period
- Exported receipts for same sale have different line totals when regenerated

**Phase to address:** Phase 8.1 (Preis-History Schema) — implement snapshot fields in `sales_items` before any price-history tracking

---

### Pitfall 2: Stock Calculation Breaks When Adding Retroactive History

**What goes wrong:**
You query cumulative sales from `sales_items` to calculate "stock on 2026-01-15", but the calculation silently omits deletions, adjustments, or receipt corrections because they weren't included in the query. You report 42 units in stock on Jan 15, but physical count shows 35. The 7-unit discrepancy stays hidden until someone notices months later.

**Why it happens:**
Stock "on X date" requires summing:
- Sales (sold → stock -)
- Receipts from Süd-Nord-Kontor (received → stock +)
- Adjustments (damaged, theft, correction → stock - or +)
- Withdrawals (KG entnimmt zum EK → stock -)

But the first implementation only includes `sales`. When you add `product_receipts` table later, historical queries still only see sales, creating silent divergence between "calculated stock" and "true stock".

**Consequences:**
- Year-end inventory reports don't match actuals
- "Stock on date X" calculations wrong by weeks of transactions
- Audit discovers gaps only during physical count
- Rechnungsexport inventory snapshots become unreliable
- System appears correct until validated against physical reality

**Prevention:**
- Design stock-query schema upfront: include all transaction types in single `inventory_transactions` table with `type: 'sale' | 'receipt' | 'adjustment' | 'withdrawal'`
- If tables stay separate, create view: `inventory_at_date(product_id, date) → stock` that unions all types and sums in order
- Add NOT NULL check: `sales_items.quantity` must always be non-null (never implicit zero)
- Document transaction types explicitly in migration: which operations affect stock, which don't
- For any new transaction type added later, retroactively backfill or explicitly document gap in history

**Detection:**
- `SELECT COUNT(*) WHERE quantity = NULL AND type = 'sale'` should return 0
- Test query: stock on 2025-01-01 + sum(all transactions from Jan 1 to today) should equal current stock
- Compare calculated stock vs physically counted → if discrepancy, trace missing transaction type

**Phase to address:** Phase 8.2 (Inventur-Übersicht) — design and test stock calculation before implementing inventory reports

---

### Pitfall 3: Price-History Trigger Cascades into Performance Cliff

**What goes wrong:**
You add a PostgreSQL trigger on `products` UPDATE that writes to `products_price_history` table. For the first month, 30 price changes = 30 rows. Fine. By month 12, you have thousands. Then you backfill 3 years of "estimated prices" by running UPDATE on 100 products. The trigger fires 100 times. Trigger function queries the products table, audit table, and recalculates derived columns. Suddenly checkpoint/vacuum takes 2 hours and POS becomes unresponsive during price updates.

**Why it happens:**
Triggers are synchronous and fire in transaction. A naive trigger might:
1. Insert into audit table
2. Query old values from audit table to compare
3. Update derived columns
4. Vacuum history table

This cascade happens for every single product update, and scales poorly when bulk-importing prices.

**Consequences:**
- Admin price bulk-import hangs or times out
- Concurrent sales become slow during price updates
- Vacuum causes 5+ minute write locks
- Team disables trigger to fix (breaking audit trail)
- Schema redesign required under pressure

**Prevention:**
- Test trigger performance under load before deploying: update 1000 products in a transaction, measure query time
- Use WHEN clause to fire trigger only on actual changes: `WHEN (OLD.price_vk IS DISTINCT FROM NEW.price_vk)` — skips no-op updates
- Keep trigger function simple: insert into audit table only, defer analysis/validation to app layer
- Use AFTER trigger (not BEFORE), never query the same table inside trigger
- For bulk imports: batch into 50-item transactions instead of single 1000-item UPDATE
- Add ANALYZE/VACUUM strategy for history table: vacuum after import, not continuously

**Detection:**
- Single product price update takes >100ms
- EXPLAIN PLAN on history audit shows sequential scan
- EXPLAIN ANALYZE on price-history trigger shows N2 query plan

**Phase to address:** Phase 8.3 (Preis-History Implementation) — implement and load-test triggers before shipping

---

### Pitfall 4: Receipt Export Breaks When Sale Structure Changes

**What goes wrong:**
You build receipt PDF export querying `sales` + `sales_items` + `products`, rendering line items with quantity + price_vk. But `products` schema changed: you renamed `name` to `title`, or added `sku`. Old sales still reference the product, but export query breaks because column is missing. Or worse, the join silently returns NULLs and the PDF renders blank line items.

**Why it happens:**
Receipt export typically runs as:
```sql
SELECT 
  si.quantity, 
  si.price_vk_cents, 
  p.name,  -- ← this column gets renamed to title, schema update not reflected
  p.category
FROM sales_items si
JOIN products p ON si.product_id = p.id
WHERE si.sale_id = $1
```

When `products.name` → `products.title` migration happens, the export query still references `.name` and gets NULL. No error, just silent data loss in the PDF.

**Consequences:**
- Exported receipts show blank product names
- Line items have zero amounts (NULL → rendered as empty)
- Issue discovered when user exports receipt, not during deploy
- Must patch export queries across frontend/backend
- Customer receipts generated with missing data (audit trail broken)

**Prevention:**
- Store complete product snapshot in `sales_items` table: `product_name`, `product_category` at sale time
- Never join `sales_items` → `products` in export queries — use only `sales_items` denormalized data
- For receipt export, the data should be complete in `sales` + `sales_items` alone
- Add schema test: `SELECT * FROM sales_items LIMIT 1` must have all export-required columns
- Add migration test: export receipt before/after schema change, byte-compare PDFs

**Detection:**
- `SELECT COUNT(*) FROM sales_items WHERE product_name IS NULL AND created_at > '2026-01-01'` should return 0
- Manual export of recent sale + inspect PDF for blank fields
- Integration test: generate receipt PDF for every test sale, assert no NULLs in output

**Phase to address:** Phase 8.4 (Rechnungsexport) — store complete snapshot in `sales_items` before implementing export

---

## Moderate Pitfalls

Pitfalls that cause bugs or suboptimal reports, but not data loss.

### Pitfall 5: Rounding Accumulation in Inventory Valuations

**What goes wrong:**
Monthly inventory report values stock at cost using: `quantity * price_per_unit_cents / 100`. After 12 months and thousands of sales, cumulative rounding errors cause inventory value to be off by €2-3, which breaks accounting reconciliation.

**Example:**
- Sale 1: 1 unit @ €1.234567/unit → stored as 123.4567 cents, inventory value = 123.4567c
- Sale 2: 1 unit @ €0.765432/unit → 76.5432c, inventory value = 76.5432c (total = 199.9999c = €1.99, not €2.00)
- After 1000 transactions: rounding errors compound

**Why it happens:**
Fairstand already uses cent-integers for prices (good), but valuations computed at reporting time can still accumulate rounding if not careful. Reports often compute: `SUM(quantity * unit_cost) / 100` which hides integer division edge cases.

**Consequences:**
- Year-end inventory valuation off by €5-10 (for 50 products)
- Audit discrepancy for accounting export
- Rechnungsexport total cost doesn't match GL records
- Expensive to trace retroactively

**Prevention:**
- Store inventory valuations in database table after each transaction: `inventory_value_cents` (INTEGER) = `quantity_remaining * price_ek_cents`
- Never compute valuation at query time; compute at transaction commit time and store
- For reports: SUM the pre-computed `inventory_value_cents` column, not recalculated values
- Test rounding with historical data: import real sales, compare SUM(inventory_value_cents) vs manually calculated sum

**Detection:**
- `SELECT SUM(quantity * price_ek_cents) FROM sales_items` vs `SELECT SUM(inventory_value_total_cents) FROM inventory_values` should match exactly
- Year-end test: compare report total to GL inventory account balance (should be identical)

**Phase to address:** Phase 8.5 (Inventur-Auswertung) — implement pre-computed valuations during inventory phase

---

### Pitfall 6: Date Precision Loss in Price-History Timestamps

**What goes wrong:**
You store price-change timestamps as `DATE` (day precision) instead of `TIMESTAMP WITH TIME ZONE`. Later, the team changes a product price twice in one day (e.g., morning 8:00 and noon 13:00). The history table shows only one change with today's date. When generating reports "as of 12:30", the query can't tell which price was active at that time.

**Why it happens:**
Quick schema: `products_price_history(id, product_id, price_vk, changed_at DATE)` seemed reasonable. But same-day corrections are common in retail. Using DATE loses intra-day resolution.

**Consequences:**
- Can't generate "stock valuation at 2026-03-15 14:00" reports with correct prices
- Report "as of" queries become ambiguous
- Auditors can't determine which price was effective at a given moment
- Receipt export "as of date X" becomes unreliable if multiple price changes same day

**Prevention:**
- Always use `TIMESTAMP WITH TIME ZONE` for audit/history timestamps, never DATE
- Add `changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`
- Add index: `CREATE INDEX ON products_price_history(product_id, changed_at DESC)` for efficient point-in-time queries
- For reports "as of date": use `WHERE changed_at <= target_timestamp` and sort by `changed_at DESC LIMIT 1` to get correct price at that moment

**Detection:**
- `SELECT product_id, DATE(changed_at), COUNT(*) FROM products_price_history GROUP BY product_id, DATE(changed_at) HAVING COUNT(*) > 1` reveals same-day changes
- Test query: price as of 14:30 on day with two price changes → assert returns correct price

**Phase to address:** Phase 8.3 (Preis-History Implementation) — use TIMESTAMP WITH TIME ZONE in schema

---

### Pitfall 7: Inventory Reports Show "Future Stock" When Filtered Wrong

**What goes wrong:**
Report queries "inventory at 2026-03-15" but accidentally includes transactions from 2026-03-16 due to a WHERE clause using `created_at <= '2026-03-15 23:59:59'` without converting to TIMESTAMP, or timezone mismatch (UTC vs local time). The report shows 47 units on March 15, but the actual count was 43 (4 units sold on March 16 slipped into the query).

**Why it happens:**
Complex date filtering with DATE vs TIMESTAMP types, or timezone handling in PostgreSQL, can be subtle. `created_at <= '2026-03-15'` might include early-morning March 16 transactions if the DB is UTC and the report runs in CET.

**Consequences:**
- Monthly inventory reports off by N units (unclear which direction)
- Audit discrepancies in stock reconciliation
- Team manually corrects reports, masking the bug
- Rechnungsexport for "stock as of March 15" shows wrong quantities

**Prevention:**
- Always explicit: `created_at < '2026-03-16'::DATE` or `created_at < '2026-03-16 00:00:00+02'::TIMESTAMP WITH TIME ZONE`
- Store and query using TIMESTAMP WITH TIME ZONE consistently
- Add timezone conversion at app layer: `new Date('2026-03-15').toISOString()` → query with explicit timezone
- Test: run inventory report for date X and date X+1, verify continuity: stock_x+1 = stock_x ± transactions_on_x+1
- Document report period definition explicitly in code comments

**Detection:**
- Run inventory report for date X and date X+1, verify continuity: stock_x+1 = stock_x ± transactions_on_x+1
- Test with UTC and CET databases to catch timezone edge cases

**Phase to address:** Phase 8.2 (Inventur-Übersicht) — use explicit DATE/TIMESTAMP logic in all inventory queries

---

## Minor Pitfalls

Pitfalls that cause UX friction or maintenance burden.

### Pitfall 8: Rechnungsexport Doesn't Include Storno Information

**What goes wrong:**
You export a receipt PDF for a completed sale, but don't include whether the sale was stornoed or adjusted later. Customer queries the receipt, but the exported version shows the original sale without noting "stornoed 2026-03-16" or "returned 1 unit on 2026-03-17". The receipt becomes misleading.

**Why it happens:**
Receipt export queries only `sales` + `sales_items` at transaction time and doesn't check `sales.cancelled_at`. Or the export assumes sales are immutable.

**Consequences:**
- Exported receipts are incomplete audit records
- Customer questions why receipt shows different amount than their credit
- Rechnungsexport for accounting doesn't disclose stornos, making reconciliation harder
- Team manually edits PDFs (unsustainable)

**Prevention:**
- Receipt export always checks: `IF sale.cancelled_at IS NOT NULL, append "STORNIERT [date]" to receipt footer`
- For stornoed sales, export shows original items + refund note, not just original data
- Test: export receipt for sale, then storno it, re-export same sale_id, assert storno note appears
- Consider: should stornoed sales even be exportable? Or export as "CANCELLED SALE [date]" instead?

**Detection:**
- Manual test: storno a sale, export its receipt, verify cancellation note present
- Query test: `SELECT * FROM sales WHERE cancelled_at IS NOT NULL LIMIT 5` then export each, inspect PDFs

**Phase to address:** Phase 8.4 (Rechnungsexport) — include cancellation status in export logic

---

### Pitfall 9: Price-History Table Grows Too Large, Queries Slow Down

**What goes wrong:**
After 6 months, `products_price_history` has 50,000 rows (every price change logged). Reporting queries that join `sales` → `products_price_history` start timing out. The team discovers the performance regression when generating year-end reports.

**Why it happens:**
No archival or partitioning strategy for history tables. As price change frequency increases (especially during bulk imports or seasonal adjustments), the table grows unbounded.

**Consequences:**
- Report queries time out or require query optimization
- Page loads slow down when displaying product price history in UI
- Database backup size grows significantly
- Year-end reporting becomes painfully slow

**Prevention:**
- Add archival strategy: move history older than 12 months to archive table or partition by year
- Create index: `CREATE INDEX ON products_price_history(product_id, changed_at DESC)` for efficient lookups
- Monitor table size: `SELECT COUNT(*) FROM products_price_history` monthly
- For reports: use selective date ranges, not "all history"
- Consider: do you need full history in main DB, or can it be archived to separate store?

**Detection:**
- `EXPLAIN ANALYZE` on price-history report queries shows Sequential Scan
- Report generation time >5 seconds for 1-year data range
- Table row count >100,000

**Phase to address:** Phase 8.6 (Performance Optimization) — add indexing and archival strategy after shipping v8.0

---

### Pitfall 10: Inventory Report Doesn't Account for Product Deactivations

**What goes wrong:**
Artikel "Schokolade XL" was active all year, sold 100 units, then deactivated in December. Year-end inventory report lists it as "0 in stock, 100 sold" but doesn't show it was deactivated. Team manually checks which products should be in report, wasting time.

**Why it happens:**
Report queries `products WHERE active = true` and joins to sales, but deactivated products are filtered out, making the report incomplete for audit purposes.

**Consequences:**
- Year-end inventory audit incomplete (missing deactivated products)
- Team manually inserts deactivated products into reports
- Audit trail doesn't show lifecycle of products
- Rechnungsexport misses deactivated product sales

**Prevention:**
- Always include deactivated products in inventory reports, mark with `[DEACTIVATED]` label
- Query: `FROM products WHERE 1=1` (no active filter) and use `products.active` in report display
- Group report by active status: "Active Products", "Deactivated Products"
- Document in export: "Includes deactivated products with final stock count at deactivation date"

**Detection:**
- Manual test: deactivate a product that has sales, generate inventory report, assert product appears marked as deactivated
- Query: `SELECT COUNT(*) FROM products WHERE active = false AND id IN (SELECT DISTINCT product_id FROM sales)` — should match expectations

**Phase to address:** Phase 8.5 (Inventur-Auswertung) — include deactivated products in inventory reports

---

## Phase-Specific Warnings

| Phase | Topic | Pitfall | Mitigation |
|-------|-------|---------|-----------|
| 8.1 | Preis-History Schema | Snapshot staleness (Pitfall 1) | Add `price_vk_cents`, `price_ek_cents` to `sales_items` during migration, test before deploying price changes |
| 8.2 | Inventur-Übersicht | Stock calc breaks (Pitfall 2), date precision (Pitfall 7) | Design unified transaction table, use TIMESTAMP WITH TIME ZONE, test stock continuity |
| 8.3 | Preis-History Impl | Trigger perf (Pitfall 3), timestamp precision (Pitfall 6) | Load-test triggers, use WHEN clause, add TIMESTAMP WITH TIME ZONE, test same-day price changes |
| 8.4 | Rechnungsexport | Receipt breaks on schema change (Pitfall 4), storno info missing (Pitfall 8) | Store product snapshot in sales_items, include cancelled_at in export, test stornoed receipts |
| 8.5 | Inventur-Auswertung | Rounding accumulation (Pitfall 5), deactivated products (Pitfall 10) | Pre-compute inventory valuations, include deactivated products in reports |
| 8.6 | Performance | History table bloat (Pitfall 9) | Add indexing and archival strategy, monitor query times |

---

## Design Decisions That Prevent Pitfalls

Based on Fairstand's existing tech stack, these decisions prevent the above pitfalls:

| Decision | Prevents | Rationale |
|----------|----------|-----------|
| Cent-integers for all prices | Rounding errors (Pitfall 5) | Already established; ensure all snapshot columns use same format. |
| PostgreSQL with Drizzle ORM | Trigger mishaps (Pitfall 3) | Explicit schema migrations, transaction control, WHEN clauses supported. |
| Server as Single Source of Truth | Snapshot staleness (Pitfall 1) | All historical data stored server-side; no client-side caching divergence. |
| Session-based shopId validation | Data isolation (not listed, but relevant) | Prevents multi-shop data leaks in reports. |
| Online-Only architecture | Offline sync bugs (not relevant here) | Simplifies inventory calculation (no offline queue complications). |

---

## Open Questions for Phase-Specific Research

1. **Should price-history trigger or app-layer change logging?** Triggers are atomic but risky; app-layer is slower but testable. Need load-test before deciding.
2. **How far back should inventory history go?** Fairstand has 7 phases of existing data. Should v8.0 backfill estimated prices for all, or start fresh from v8.0 forward? Decision impacts schema design.
3. **Receipt format / PDF requirements?** What fields must appear in Rechnungsexport for church audit purposes? (Impacts which columns need snapshot storage)
4. **Inventory reconciliation frequency?** Monthly? Weekly? This affects how detailed price-history snapshots need to be.

---

## Sources

- [Database Design for Audit Logging](https://www.red-gate.com/blog/database-design-for-audit-logging) — Audit trail patterns (MEDIUM confidence)
- [Working with Postgres Audit Triggers](https://www.enterprisedb.com/postgres-tutorials/working-postgres-audit-triggers) — Trigger best practices, WHEN clauses (HIGH confidence, official EDB)
- [Row change auditing options for PostgreSQL](https://www.cybertec-postgresql.com/en/row-change-auditing-options-for-postgresql/) — Trigger performance considerations (MEDIUM confidence)
- [Historical Trend vs. Reporting Snapshot in Salesforce](https://medium.com/@shirley_peng/historical-trend-vs-reporting-snapshot-in-salesforce-how-to-choose-with-examples-be3d3ba64c8d) — Snapshot vs live data pitfalls (MEDIUM confidence)
- [How to reconcile inventory — AccountingTools](https://www.accountingtools.com/articles/how-do-i-reconcile-inventory.html) — Stock calculation and unrecorded transaction issues (MEDIUM confidence)
- [Understanding Rounding Errors in Accounting](https://www.enerpize.com/hub/rounding-error) — Cumulative rounding impact (MEDIUM confidence)
- [Death by Rounding - Engora Data Blog](https://blog.engora.com/2020/06/death-by-rounding.html) — Vancouver Stock Exchange case study (HIGH confidence, historical example)
- [Sales and payments report rounding discrepancies – Lightspeed Retail](https://x-series-support.lightspeedhq.com/hc/en-us/articles/25534277095323-Sales-and-payments-report-1-cent-rounding-discrepancies) — Real-world POS rounding bugs (HIGH confidence, vendor documentation)

---

*Last updated: 2026-04-01 for v8.0 milestone*
