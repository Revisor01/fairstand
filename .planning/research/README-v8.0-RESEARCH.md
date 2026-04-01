# v8.0 Research — Complete Guidance for Phase Planning

**Milestone:** v8.0 Inventur, Preis-History & Rechnungsexport
**Research completed:** 2026-04-01
**Status:** Ready for phase roadmap planning

---

## What's in This Research

Three detailed documents inform v8.0 phase planning:

### 1. **PITFALLS-v8.0-MILESTONE.md** → Risk Mitigation
**Read this for:** Understanding what can go wrong and how to prevent it

- **10 pitfalls identified** (4 critical, 4 moderate, 2 minor)
- **Each pitfall includes:**
  - What goes wrong
  - Why it happens
  - Consequences if ignored
  - How to prevent it
  - Detection/testing strategy
  - Which phase should address it

**Critical pitfalls to prevent (Phase 8.1-8.2):**
1. Snapshot staleness — using live `products.price` instead of `sales_items` snapshots
2. Stock calculation breaks — incomplete transaction history (missing receipts/adjustments)
3. Trigger performance cliff — naive triggers without WHEN clauses hang bulk imports
4. Receipt export breaks on schema changes — no product snapshots in `sales_items`

**Most actionable finding:** All critical pitfalls are preventable with upfront schema design in Phase 8.1. No rewrites required if caught early.

---

### 2. **SUMMARY-v8.0-MILESTONE.md** → Phase Structure & Roadmap Implications
**Read this for:** Understanding phase dependencies and what each phase should accomplish

- **Executive summary** of research findings (3 paragraphs)
- **Phase ordering rationale** with dependencies:
  - Phase 8.1 (Preis-History Schema) is **hard blocker** for others
  - Phase 8.2 (Inventur-Übersicht) is hard blocker for 8.5
  - Phases 8.3 & 8.4 can run parallel
  - Phase 8.6 (Performance) is strictly last
  
- **Success criteria** (10 checkpoints for end of v8.0)
- **Open questions** requiring phase-specific research (5 items)
- **High-risk integration points** with mitigation strategies

**Most actionable finding:** Do phases in order (8.1→8.2→8.3/8.4→8.5→8.6). Skipping 8.1 breaks 8.4 and 8.5.

---

### 3. **ARCHITECTURE-v8.0-MILESTONE.md** → Detailed Schema & Data Flow Patterns
**Read this for:** Understanding exactly what schema changes and queries to implement

- **Data model diagrams** (what v7.0 has → what v8.0 adds)
- **6 concrete design patterns** with code examples:
  1. Price snapshot at sale time (Fastify route)
  2. Price history trigger with WHEN clause (PL/pgSQL)
  3. Unified stock calculation (SQL view + query)
  4. Rounding-safe inventory valuation (pre-computed, stored)
  5. Receipt export with snapshots (PDF generation example)
  6. Year-end inventory report (complex SELECT with unions)

- **5 anti-patterns to avoid** (with ❌/✅ examples)
- **Scalability table** (what works at 50 vs 1000 products)
- **Integration notes** (how v8.0 fits with existing Fastify/PostgreSQL/Drizzle stack)

**Most actionable finding:** Copy/adapt the SQL views and Fastify route patterns directly into Phase 8.1-8.5.

---

## Quick-Reference Decision Tree

**Question: How should I phase v8.0?**

```
START
  ↓
"Do we need price history snapshots in sales_items?"
  ↓
  YES → Phase 8.1 (Preis-History Schema)
         [PREREQUISITE for all others]
  ↓
"Do we have product_receipts, adjustments, withdrawals tables?"
  ↓
  PARTIAL/NO → Phase 8.2 (Inventur-Übersicht Schema)
               [Design unified stock view first]
  ↓
"Is trigger performance proven?"
  ↓
  NO → Phase 8.3 (Preis-History Trigger Optimization)
       [Load-test before 8.5]
  ↓
"Can we export receipts with product snapshots?"
  ↓
  NO → Phase 8.4 (Rechnungsexport)
       [Depends only on 8.1]
  ↓
"Are all snapshots populated and queries validated?"
  ↓
  YES → Phase 8.5 (Inventur-Auswertung)
        [Year-end reports, final feature set]
  ↓
"Are all queries fast enough?"
  ↓
  NO → Phase 8.6 (Performance Optimization)
       [Indexing, archival, query tuning]
  ↓
END (v8.0 shipped)
```

---

## Research Confidence Levels

| Area | Confidence | Notes | Next Step |
|------|------------|-------|-----------|
| Snapshot staleness pitfall | **HIGH** | Confirmed in real-world examples; straightforward prevention | Implement in 8.1 |
| Stock calculation pitfalls | **MEDIUM-HIGH** | Standard accounting practice; requires schema validation | Validate schema design in 8.2 |
| Trigger performance | **MEDIUM** | PostgreSQL patterns clear; requires load-testing | Load-test in 8.3 |
| Rounding accumulation | **HIGH** | Well-documented problem; prevention via pre-computed values | Implement in 8.5 |
| Date filtering bugs | **MEDIUM** | Requires careful testing in Fairstand's PostgreSQL environment | Test edge cases in 8.2 |
| PDF export pitfalls | **MEDIUM** | General patterns clear; Fairstand-specific requirements unclear | Clarify with Swantje in 8.4 |

**Gaps to resolve in phase-specific research:**
- Receipt export format (what fields for church bookkeeper?)
- Inventory reconciliation cadence (monthly vs weekly?)
- Price history backfill scope (all historical sales or fresh start?)

---

## Critical Schema Decisions (Implement in Phase 8.1)

These three changes prevent all 4 critical pitfalls:

### 1. Add Price Snapshots to `sales_items`
```sql
ALTER TABLE sales_items ADD COLUMN price_vk_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sales_items ADD COLUMN price_ek_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sales_items ADD COLUMN product_name VARCHAR(255);
ALTER TABLE sales_items ADD COLUMN product_category VARCHAR(255);
```

**Prevents:** Pitfall 1 (Snapshot staleness), Pitfall 4 (Receipt export breaks)

### 2. Create Price History Table with Trigger
```sql
CREATE TABLE products_price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  price_vk_cents INTEGER NOT NULL,
  price_ek_cents INTEGER NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(100)
);

CREATE INDEX ON products_price_history(product_id, changed_at DESC);

CREATE OR REPLACE FUNCTION log_product_price_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO products_price_history (product_id, price_vk_cents, price_ek_cents, changed_by)
  VALUES (NEW.id, NEW.price_vk * 100, NEW.price_ek * 100, COALESCE(current_user, 'system'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_price_history_trigger
AFTER UPDATE ON products
FOR EACH ROW
WHEN (OLD.price_vk IS DISTINCT FROM NEW.price_vk OR OLD.price_ek IS DISTINCT FROM NEW.price_ek)
EXECUTE FUNCTION log_product_price_change();
```

**Prevents:** Pitfall 3 (Trigger performance cliff), Pitfall 6 (Date precision loss)

### 3. Populate Snapshots from Current Data
```sql
UPDATE sales_items 
SET price_vk_cents = (SELECT price_vk * 100 FROM products WHERE id = product_id),
    price_ek_cents = (SELECT price_ek * 100 FROM products WHERE id = product_id),
    product_name = (SELECT name FROM products WHERE id = product_id),
    product_category = (SELECT category FROM products WHERE id = product_id)
WHERE price_vk_cents = 0;  -- only unpopulated rows
```

**Prevents:** Pitfall 2 (Stock breaks), Pitfall 4 (Receipt breaks)

---

## Phase Milestones & Deliverables

| Phase | Duration | Deliverable | Blocks |
|-------|----------|-------------|--------|
| **8.1: Preis-History Schema** | 2 weeks | Price snapshots in `sales_items`, history table, trigger | 8.4, 8.5 |
| **8.2: Inventur-Übersicht** | 2 weeks | Stock-at-date calculations, unified transaction view | 8.5 |
| **8.3: Preis-History Trigger** | 1 week | Trigger load-tested, indexing strategy | (parallel) |
| **8.4: Rechnungsexport** | 1.5 weeks | PDF/CSV receipt export with snapshots | (parallel) |
| **8.5: Inventur-Auswertung** | 1.5 weeks | Year-end inventory report, valuations, deactivated handling | (last) |
| **8.6: Performance Optimization** | 1 week | Archival, indexing tuning, query optimization | (optional, after 8.5) |
| **Total:** | ~9 weeks | Complete v8.0 feature set | - |

---

## Implementation Checklist for Each Phase

### Phase 8.1: Preis-History Schema
- [ ] Add `price_vk_cents`, `price_ek_cents` columns to `sales_items`
- [ ] (Optional) Add `product_name`, `product_category` to `sales_items`
- [ ] Create `products_price_history` table
- [ ] Implement trigger with WHEN clause
- [ ] Migrate existing `sales_items` with snapshot prices
- [ ] Verify: every `sales_items` row has non-null prices
- [ ] Load-test: 100 price updates completes <5s
- [ ] Document schema change in CHANGELOG

### Phase 8.2: Inventur-Übersicht
- [ ] Verify all transaction tables exist (`sales_items`, `product_receipts`, `adjustments`, `withdrawals`)
- [ ] Create `inventory_transactions_all` view
- [ ] Implement `stock_at_date(product_id, date)` function
- [ ] Test: stock continuity (stock(X) + transactions = stock(X+1))
- [ ] Test: date filtering with UTC/CET edge cases
- [ ] Design UI/API for inventory overview
- [ ] Document schema assumptions in code

### Phase 8.3: Preis-History Trigger
- [ ] Verify trigger fires on product price changes
- [ ] Load-test: 1000 product updates, measure completion time
- [ ] Add index: `products_price_history(product_id, changed_at DESC)`
- [ ] Test: same-day price changes logged correctly
- [ ] Monitor: CPU/IO during price batch imports
- [ ] Document trigger maintenance in ops guide

### Phase 8.4: Rechnungsexport
- [ ] Clarify receipt export requirements with Swantje
- [ ] Implement PDF generation using `sales_items` snapshots
- [ ] Implement CSV export for accounting
- [ ] Include `cancelled_at` status in exports
- [ ] Test: export receipt, storno it, re-export, verify note
- [ ] Test: product schema changes don't break exports
- [ ] Document export format in README

### Phase 8.5: Inventur-Auswertung
- [ ] Implement year-end inventory report query
- [ ] Add `inventory_value_cents` pre-computation
- [ ] Include deactivated products with label
- [ ] Account for multiple EK prices per article
- [ ] Test: report regenerated 3x shows identical totals
- [ ] Test: rounding accumulation <€0.01 for 1000 items
- [ ] Export report to CSV for church bookkeeper
- [ ] Document assumptions (date ranges, included transactions)

### Phase 8.6: Performance Optimization
- [ ] Measure query times for each report type
- [ ] Add indexes where EXPLAIN ANALYZE shows seq scans
- [ ] Plan archival strategy for `products_price_history` if >100k rows
- [ ] Document SLA: report generation <5s for any query
- [ ] Monitor: database size, backup duration

---

## How to Use This Research

### For Phase 8.1 Planning
1. Copy SQL from ARCHITECTURE-v8.0-MILESTONE.md (section "Pattern 2: Price History Trigger")
2. Review PITFALLS-v8.0-MILESTONE.md (Pitfall 1-4) for what to avoid
3. Use SUMMARY-v8.0-MILESTONE.md success criteria as acceptance tests

### For Phase 8.2 Planning
1. Review ARCHITECTURE-v8.0-MILESTONE.md (section "Pattern 3: Unified Stock Calculation")
2. Check PITFALLS-v8.0-MILESTONE.md (Pitfall 2, 7) for edge cases
3. Design all transaction types before writing queries

### For Phase 8.4-8.5 Planning
1. Verify 8.1 is shipped and tested
2. Use ARCHITECTURE-v8.0-MILESTONE.md (sections 4-6) for detailed query patterns
3. Validate against SUMMARY-v8.0-MILESTONE.md success criteria

### For v8.0 Acceptance Testing
1. Run all checkpoints in SUMMARY-v8.0-MILESTONE.md ("What this milestone should achieve")
2. Cross-check against PITFALLS-v8.0-MILESTONE.md ("Looks done but isn't" checklist)
3. Verify no anti-patterns in ARCHITECTURE-v8.0-MILESTONE.md

---

## Questions This Research Couldn't Answer

These require phase-specific research or stakeholder input:

1. **Price history backfill:** Should v8.0 estimate/reconstruct EK prices for all v1-v7 sales, or accept a gap starting from v8.0?
   - **Impact:** Affects whether 8.1 migration needs to backfill historical data
   - **Stakeholder:** Simon, Swantje

2. **Receipt export format:** What fields must appear in Rechnungsexport for church bookkeeper audit?
   - **Impact:** Affects which columns to store in `sales_items` snapshot
   - **Stakeholder:** Church bookkeeper / Swantje

3. **Inventory reconciliation cadence:** Monthly? Weekly? Quarterly?
   - **Impact:** Affects whether to pre-compute and store valuations
   - **Stakeholder:** Swantje

4. **Deactivated product policy:** Can deactivated products ever be re-sold, or are they permanent?
   - **Impact:** Affects how to track lifecycle in history tables
   - **Stakeholder:** Swantje

---

## Key Metrics to Track

After v8.0 ships, measure these to validate the research:

- **Report consistency:** Year-end inventory report regenerated monthly should show identical totals
- **Stock accuracy:** Calculated stock vs physically counted should match within 0 units
- **Price auditability:** Any price change traceable to timestamp in `products_price_history`
- **Query performance:** All reports execute <5 seconds for any date range
- **Rounding error:** Cumulative inventory valuation discrepancy <€0.01 across all products
- **Receipt reliability:** PDF/CSV exports include all snapshot data; no NULL fields

---

## References

**All research files are in:** `/Users/simonluthe/Documents/fairstand/.planning/research/`

- `PITFALLS-v8.0-MILESTONE.md` — Risk identification & mitigation
- `SUMMARY-v8.0-MILESTONE.md` — Phase structure & roadmap implications  
- `ARCHITECTURE-v8.0-MILESTONE.md` — Detailed schema & query patterns
- `README-v8.0-RESEARCH.md` — This file (overview & how to use)

---

*Research completed: 2026-04-01 | Status: Ready for phase planning | Confidence: MEDIUM-HIGH (HIGH on critical pitfalls, MEDIUM on specifics requiring phase validation)*
