# Research Summary: v8.0 Milestone (Inventur, Preis-History & Rechnungsexport)

**Project:** Fairstand Kassensystem
**Milestone:** v8.0 — Inventur-Übersicht, EK/VK-Preis-History, Bestandsverlauf, Rechnungsexport
**Researched:** 2026-04-01
**Overall confidence:** MEDIUM (industry patterns + WebSearch, some areas need phase-specific validation)

---

## Executive Summary

Adding price history tracking, inventory reports, and receipt export to an existing POS system requires careful attention to **data snapshot timing** and **historical transaction consistency**. The critical differentiator between a reliable system and one that drifts into audit discrepancies is whether you store product/price data **at transaction time** (in `sales_items`) or **query it live** (from `products` table).

Fairstand's architecture — PostgreSQL + Drizzle ORM + server-side source-of-truth — is well-positioned to avoid the most common pitfall (snapshot staleness). However, three specific risks exist:

1. **Snapshot staleness** — if `sales_items` doesn't store price snapshots, historical reports become unreliable
2. **Incomplete stock calculations** — if inventory history includes only sales but not receipts/adjustments/withdrawals, calculated stock diverges from physical count
3. **Trigger performance degradation** — if price-history tracking uses naive triggers without WHEN clauses, bulk price imports will hang the system

All three are **preventable with upfront schema design** — no rewrites required if caught before Phase 8.2.

---

## Key Findings

**Stack:** PostgreSQL 16 + Drizzle ORM + Fastify 5 (existing, excellent foundation)
**Architecture:** Server as Single Source of Truth (eliminates offline-sync divergence bugs)
**Critical pitfall:** Missing price snapshots in `sales_items` at transaction time (impacts all historical reports)

---

## Implications for Roadmap

### Phase Ordering & Dependencies

v8.0 should be structured in **strict order** because later phases depend on earlier schema decisions:

1. **Phase 8.1: Preis-History Schema** (prerequisite for all others)
   - Add `price_vk_cents`, `price_ek_cents` to `sales_items` table
   - Migrate existing `sales_items` — populate from current `products` prices
   - Create `products_price_history` table with `TIMESTAMP WITH TIME ZONE`
   - Add PostgreSQL trigger with `WHEN` clause to log only actual price changes
   - **Output:** schema ready for price tracking; existing sales have price snapshots
   - **Blocks:** Phases 8.4 (Rechnungsexport) and 8.5 (Inventur-Auswertung) — they need snapshot prices

2. **Phase 8.2: Inventur-Übersicht Schema & Stock Calculation**
   - Design unified view: stock calculations must account for `sales` + `product_receipts` + `adjustments` + `withdrawals`
   - Use explicit `TIMESTAMP WITH TIME ZONE` in all queries to prevent date-filtering bugs
   - Implement stock-continuity test: stock(date) + sum(transactions on date) = stock(date+1)
   - **Output:** reliable stock-at-date queries; UI schema for inventory overview
   - **Blocks:** Phase 8.5 (reports depend on correct stock calculations)

3. **Phase 8.3: Preis-History Trigger Optimization & Load Testing**
   - Implement and load-test the price-history trigger from Phase 8.1
   - Ensure trigger performance: single price update <100ms, bulk 100-product import <5s
   - Add indexing: `products_price_history(product_id, changed_at DESC)`
   - **Output:** trigger proven performant under load; indexing strategy documented
   - **Blocks:** None — can run parallel with 8.2 and 8.4 (but 8.1 required first)

4. **Phase 8.4: Rechnungsexport PDF/CSV Generation**
   - Implement receipt export using `sales_items` snapshot columns (from Phase 8.1)
   - Store `product_name`, `product_category` in `sales_items` if not already there
   - Include `sales.cancelled_at` status in exported receipts
   - **Output:** customer-facing receipt export + accounting CSV
   - **Blocks:** None — depends only on Phase 8.1 snapshots

5. **Phase 8.5: Inventur-Auswertung & Year-End Reports**
   - Implement year-end inventory report: per-article quantity, VK umsatz, EK costs
   - Pre-compute `inventory_value_cents` to prevent rounding accumulation
   - Include deactivated products in reports with `[DEACTIVATED]` label
   - Account for multiple EK prices per article (via `sales_items.price_ek_cents` history)
   - **Output:** auditable year-end inventory; accounting export
   - **Blocks:** None — depends on Phases 8.1 (snapshots) and 8.2 (stock calculation)

6. **Phase 8.6: Performance Optimization & Archival**
   - Add partitioning or archival for `products_price_history` (if >100k rows)
   - Monitor/tune report query times; add indexes as needed
   - Document archival strategy for accounting audit trail
   - **Output:** production-ready queries; performance SLA met
   - **Can run:** Last, after other phases prove the schema works

---

## Critical Design Requirements

To prevent the three main pitfalls, v8.0 **must include**:

### 1. Price Snapshots in `sales_items` (Prevents Pitfall 1: Snapshot Staleness)

**Schema addition:**
```sql
ALTER TABLE sales_items ADD COLUMN price_vk_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sales_items ADD COLUMN price_ek_cents INTEGER NOT NULL DEFAULT 0;
```

**Migration:**
```sql
UPDATE sales_items 
SET price_vk_cents = (SELECT price_vk * 100 FROM products WHERE id = product_id),
    price_ek_cents = (SELECT price_ek * 100 FROM products WHERE id = product_id)
WHERE price_vk_cents = 0;  -- only if not already populated
```

**Reporting rule:** All historical reports **must** use `sales_items.price_vk_cents` and `sales_items.price_ek_cents`, never `products.price_vk` or `products.price_ek`.

---

### 2. Unified Stock Calculation (Prevents Pitfall 2: Stock Breaks)

**Design choice:** Single `inventory_transactions` table or separate tables with unioned view?

**Recommendation:** Separate tables (`sales_items`, `product_receipts`, `inventory_adjustments`, `withdrawals`) with explicit view:

```sql
CREATE VIEW inventory_transactions_all AS
  SELECT product_id, created_at, -quantity AS quantity, 'sale' AS type FROM sales_items
  UNION ALL
  SELECT product_id, created_at, quantity, 'receipt' FROM product_receipts
  UNION ALL
  SELECT product_id, created_at, quantity, 'adjustment' FROM inventory_adjustments
  UNION ALL
  SELECT product_id, created_at, -quantity, 'withdrawal' FROM withdrawal_transactions
ORDER BY product_id, created_at;
```

**Stock-at-date query:**
```sql
SELECT product_id, SUM(quantity) as stock_on_date
FROM inventory_transactions_all
WHERE created_at < $1::DATE
GROUP BY product_id;
```

**Validation test:** `stock_on_date(X) + sum(transactions after X) = stock_on_date(X+1)` for all dates.

---

### 3. Trigger with WHEN Clause (Prevents Pitfall 3: Performance Cliff)

**Schema:**
```sql
CREATE TABLE products_price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  price_vk_cents INTEGER NOT NULL,
  price_ek_cents INTEGER NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(100),  -- for audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_price_history ON products_price_history(product_id, changed_at DESC);

-- Trigger: only log when price actually changes
CREATE OR REPLACE FUNCTION log_product_price_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO products_price_history (product_id, price_vk_cents, price_ek_cents, changed_by)
  VALUES (NEW.id, NEW.price_vk * 100, NEW.price_ek * 100, COALESCE(current_user, 'unknown'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_price_history_trigger
AFTER UPDATE ON products
FOR EACH ROW
WHEN (OLD.price_vk IS DISTINCT FROM NEW.price_vk OR OLD.price_ek IS DISTINCT FROM NEW.price_ek)
EXECUTE FUNCTION log_product_price_change();
```

**Load-test:** Update 1000 products in single transaction; measure completion time (<5s).

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Snapshot staleness pitfall | HIGH | Confirmed in Salesforce docs and real-world POS failures; straightforward prevention with schema design |
| Stock calculation pitfalls | MEDIUM-HIGH | Accounting/inventory best practices clear; Fairstand's existing multi-shop architecture suggests schema capability |
| Trigger performance | MEDIUM | PostgreSQL trigger patterns well-documented; load-testing requirement is standard practice |
| Rounding accumulation | HIGH | Well-documented problem (Vancouver Stock Exchange case); prevention via pre-computed values is standard |
| Date filtering bugs | MEDIUM-HIGH | PostgreSQL TIMESTAMP WITH TIME ZONE handling requires careful testing; Fairstand already uses PostgreSQL so risk is manageable |
| PDF export pitfalls | MEDIUM | General PDF generation patterns clear; Fairstand-specific requirements need validation with Swantje |

**Gaps:**
- Receipt export format specifics (what fields required for church audit?) — need to clarify in Phase 8.4
- Bulk import use cases (backfill 3 years of price history?) — need to define scope in Phase 8.1
- Inventory reconciliation frequency (monthly? weekly?) — affects schema denormalization strategy

---

## Recommended Phase Structure

```
v8.0 PHASES
├─ 8.1: Preis-History Schema (PREREQUISITE)
│  ├─ Add price snapshots to sales_items
│  ├─ Create products_price_history table
│  ├─ Migrate existing sales with snapshot prices
│  └─ [OUTPUT: price snapshot schema ready for all reports]
│
├─ 8.2: Inventur-Übersicht Schema (PARALLEL OK, but benefits from 8.1 first)
│  ├─ Unified stock calculation view
│  ├─ Timestamp WITH TIME ZONE throughout
│  └─ [OUTPUT: stock-at-date queries validated]
│
├─ 8.3: Preis-History Trigger (PARALLEL with 8.2, 8.4)
│  ├─ Trigger implementation + WHEN clause
│  └─ Load-testing
│
├─ 8.4: Rechnungsexport (DEPENDS on 8.1 snapshots)
│  ├─ PDF/CSV receipt generation
│  └─ Include storno/cancellation info
│
├─ 8.5: Inventur-Auswertung (DEPENDS on 8.1, 8.2)
│  ├─ Year-end inventory report
│  ├─ Pre-computed valuations
│  └─ Deactivated product handling
│
└─ 8.6: Performance (LAST, after others ship)
   ├─ Indexing optimization
   ├─ Archival strategy
   └─ Query tuning
```

**Rationale:**
- 8.1 is **hard blocker** for 8.4 and 8.5 (need snapshot data)
- 8.2 is **hard blocker** for 8.5 (need stock calculation)
- 8.3 can run parallel but benefits from 8.1 schema being stable
- 8.6 is **strictly last** (optimize after other phases are proven)

---

## Phase-Specific Research Flags

| Phase | Pitfall Risk | Flag for Research | Question |
|-------|-----------|-------------------|----------|
| 8.1 | HIGH: Snapshot staleness | **YES** | Should we backfill all historical sales with current prices, or document as gap? |
| 8.1 | MEDIUM: Trigger perf | **YES** | Trigger vs app-layer logging? Trade-off between atomicity and performance. |
| 8.2 | HIGH: Stock calc | **YES** | Complete schema of all transaction types (do we have `product_receipts`, `adjustments` tables)? |
| 8.2 | MEDIUM: Date filtering | **YES** | What timezone is PostgreSQL running in? Document expected behavior for "stock at date" queries. |
| 8.4 | MEDIUM: Receipt format | **YES** | What fields must appear in Rechnungsexport for church bookkeeper audit? |
| 8.5 | MEDIUM: Deactivated products | **YES** | Should deactivated products appear in year-end inventory report? How to label? |
| 8.6 | LOW: Performance | NO | Standard optimization — run after other phases prove the design. |

---

## What This Milestone Should Achieve (Success Criteria)

By end of v8.0:

- [ ] `sales_items.price_vk_cents` and `price_ek_cents` populated for all sales (including migrated)
- [ ] Year-end inventory report regenerated 3 times shows identical totals (proves snapshot consistency)
- [ ] Stock on 2025-12-31 + sales from Jan 2026 = Stock on 2026-01-31 (proves calculation continuity)
- [ ] Price changes logged to `products_price_history` with millisecond precision (proves TIMESTAMP WITH TIME ZONE)
- [ ] Receipt export includes product name, price, quantity, and storno status (proves complete snapshots)
- [ ] Bulk price import (100 products) completes in <5s (proves trigger performance)
- [ ] No rounding discrepancies: SUM(inventory_value_cents) matches computed value for year-end (proves valuations)

---

## High-Risk Integration Points

1. **Migrating existing `sales_items` without prices**
   - Risk: If migration fails halfway, reporting is broken
   - Mitigation: Dry-run migration, validate counts before/after, run in transaction with rollback capability
   
2. **Deploying trigger without testing**
   - Risk: Trigger misbehavior locks out price updates
   - Mitigation: Load-test trigger in staging; monitor CPU/IO during deployment; have rollback procedure

3. **Switching report queries from `products.price` to `sales_items.price`**
   - Risk: Old reports suddenly show different numbers
   - Mitigation: Run both queries in parallel for a week; prove new numbers are correct before cutover

---

## Sources & Confidence Breakdown

**HIGH confidence (official docs):**
- PostgreSQL TIMESTAMP WITH TIME ZONE behavior — official PostgreSQL docs + EDB tutorials
- Trigger WHEN clause syntax — PostgreSQL documentation + EDB audit patterns

**MEDIUM confidence (industry patterns + real-world examples):**
- Snapshot staleness pitfall — Salesforce historical trends documentation
- Stock calculation from multiple transaction types — accounting best practices (AccountingTools)
- Rounding accumulation — Vancouver Stock Exchange case study + Lightspeed Retail vendor docs
- Date filtering edge cases — PostgreSQL timestamp handling; requires testing in Fairstand's DB

**MEDIUM confidence (pattern-based):**
- Trigger performance degradation — PostgreSQL performance guides; requires load-testing in Fairstand's schema
- Receipt export PDF generation — general PDF library docs; Fairstand-specific requirements need validation

---

## Open Questions for Milestone Kickoff

1. **Price history backfill:** Should v8.0 attempt to reconstruct estimated prices for all historical sales (v1-v7), or accept a gap and document it?

2. **Trigger vs app layer:** Should price-change logging use PostgreSQL trigger (atomic, automatic) or app-layer code (testable, debuggable)?

3. **Receipt export audience:** Who consumes Rechnungsexport (customer receipts, church bookkeeper, auditor)? This drives required fields and format.

4. **Inventory reconciliation cadence:** Monthly? Weekly? This affects schema denormalization decisions (store pre-computed valuations or query-time calc).

5. **Deactivated product lifecycle:** Should deactivated products ever be sold again, or are they permanent? This affects how we track them in history.

---

*Last updated: 2026-04-01*
