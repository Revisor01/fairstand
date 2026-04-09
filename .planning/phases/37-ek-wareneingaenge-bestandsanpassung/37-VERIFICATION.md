---
phase: 37-ek-wareneingaenge-bestandsanpassung
verified: 2026-04-09T16:30:00Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 0
---

# Phase 37: EK-Wareneingänge & Bestandsanpassung Verification Report

**Phase Goal:** Jede Bestandserhöhung — ob per PDF-Import oder manueller Anpassung — speichert den zugehörigen EK-Preis als eigene Bewegung in stock_movements

**Verified:** 2026-04-09T16:30:00Z
**Status:** PASSED
**Requirements Covered:** EINGANG-01, EINGANG-02, ANPASS-01, ANPASS-02

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | stockMovements-Tabelle hat nullable Spalte purchase_price_cents (integer) | ✓ VERIFIED | server/src/db/schema.ts:90 — `purchasePriceCents: integer('purchase_price_cents')` |
| 2 | Der Kommentar in schema.ts listet 'restock' als gültigen type-Wert auf | ✓ VERIFIED | server/src/db/schema.ts:86 — type comment includes `'restock'` |
| 3 | Bei positivem Delta wird der Produkt-EK oder Payload-EK als purchase_price_cents gespeichert | ✓ VERIFIED | server/src/routes/sync.ts:173-174 — fallback logic `adj.purchasePriceCents ?? adjustProd.purchasePrice` |
| 4 | Bei negativem Delta wird purchase_price_cents = null gesetzt | ✓ VERIFIED | server/src/routes/sync.ts:173-175 — ternary operator sets null when `adj.delta <= 0` |
| 5 | Der Toggle 'Preis anpassen' erscheint nur wenn parsedDelta > 0 | ✓ VERIFIED | client/src/features/admin/products/StockAdjustModal.tsx:117 — `{isPositiveDelta && (` guard |
| 6 | Mit Toggle wird der eingegebene EK-Wert (in Euro, in Cents) gespeichert | ✓ VERIFIED | StockAdjustModal.tsx:36-43 — parses input as float, converts to cents via `Math.round(parsed * 100)` |
| 7 | STOCK_ADJUST Zod-Schema akzeptiert optionales purchasePriceCents-Feld | ✓ VERIFIED | server/src/routes/sync.ts:42-48 — `purchasePriceCents: z.number().int().optional()` in StockAdjustSchema |
| 8 | POST /api/stock/adjust Endpoint existiert und schreibt restock-Bewegung in stock_movements | ✓ VERIFIED | server/src/routes/import.ts:63-117 — endpoint exists with type='restock' write at line 92 |
| 9 | ImportScreen sendet purchasePriceCents aus der Import-Zeile an /api/stock/adjust | ✓ VERIFIED | client/src/features/admin/import/ImportScreen.tsx:165 — `purchasePriceCents: row.purchasePriceCents` in payload |
| 10 | Bei bekanntem Artikel mit geändertem EK wird price_histories aktualisiert | ✓ VERIFIED | server/src/routes/import.ts:100-108 — conditional insert to priceHistories when EK differs |
| 11 | stock_movements.type ist 'restock' (nicht 'adjustment') für PDF-Import-Buchungen | ✓ VERIFIED | server/src/routes/import.ts:92 — explicitly sets `type: 'restock'` for import endpoint |
| 12 | useAdjustStock erweitert Payload um purchasePriceCents und sendet es an /api/sync | ✓ VERIFIED | client/src/hooks/api/useProducts.ts:118, 132 — hook accepts and forwards purchasePriceCents |

**Score:** 12/12 must-haves verified

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `server/src/db/schema.ts` | ✓ VERIFIED | purchasePriceCents column present, nullable, proper type definition, restock documented |
| `server/src/routes/sync.ts` | ✓ VERIFIED | STOCK_ADJUST handler extended with purchasePriceCents fallback logic, proper null handling for negative delta |
| `client/src/features/admin/products/StockAdjustModal.tsx` | ✓ VERIFIED | Toggle state and UI present, conditional rendering on isPositiveDelta, proper EK input handling |
| `client/src/hooks/api/useProducts.ts` | ✓ VERIFIED | useAdjustStock extended with purchasePriceCents parameter, forwarded in payload |
| `server/src/routes/import.ts` | ✓ VERIFIED | POST /api/stock/adjust endpoint implemented with restock type, price_histories logic, ownership checks |
| `client/src/features/admin/import/ImportScreen.tsx` | ✓ VERIFIED | handleCommit sends purchasePriceCents from parsed row data |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| StockAdjustModal.tsx | useAdjustStock | import useAdjustStock hook | ✓ WIRED | Hook called with purchasePriceCents param at line 48 |
| useAdjustStock | /api/sync | POST with STOCK_ADJUST operation | ✓ WIRED | Payload forwarded including purchasePriceCents at line 132 |
| sync.ts STOCK_ADJUST | stockMovements | INSERT with purchasePriceCents at lines 167-177 | ✓ WIRED | Fallback logic working, schema migration ready |
| ImportScreen.tsx | /api/stock/adjust | authFetch POST at line 160 | ✓ WIRED | Correctly sends productId, delta, purchasePriceCents, shopId |
| /api/stock/adjust | stockMovements | INSERT type='restock' with purchasePriceCents at lines 89-97 | ✓ WIRED | EK-Preis persisted for import |
| /api/stock/adjust | priceHistories | Conditional INSERT at lines 100-108 | ✓ WIRED | EK history tracked when value differs |

### Requirements Coverage

| Requirement | Plan | Status | Evidence |
|-------------|------|--------|----------|
| EINGANG-01 | 37-01, 37-02, 37-03 | ✓ SATISFIED | schema.ts has purchasePriceCents, sync.ts stores it, import.ts stores it — every stock increase records EK-price as movement |
| EINGANG-02 | 37-03 | ✓ SATISFIED | ImportScreen sends purchasePriceCents from PDF parse, /api/stock/adjust writes type='restock' with EK-price, price_histories updated on EK change |
| ANPASS-01 | 37-02 | ✓ SATISFIED | StockAdjustModal shows "Preis anpassen" toggle only on positive delta, allows override |
| ANPASS-02 | 37-01, 37-02 | ✓ SATISFIED | On positive delta, EK saved (from override or Produkt-EK fallback); on negative delta, EK set to null |

### Anti-Patterns Scan

| File | Finding | Type | Assessment |
|------|---------|------|------------|
| StockAdjustModal.tsx | Conditional rendering uses `{isPositiveDelta &&` pattern | Pattern match | ✓ CORRECT — proper React pattern, not a stub |
| useProducts.ts | purchasePriceCents optional in hook signature | Pattern match | ✓ CORRECT — intentional optionality for backward compat |
| sync.ts | Ternary operator `adj.delta > 0 ? (adj.purchasePriceCents ?? ...) : null` | Pattern match | ✓ CORRECT — explicit fallback logic matches threat mitigation T-37-04 |
| import.ts | Conditional priceHistories INSERT only on EK change | Pattern match | ✓ CORRECT — prevents history spam, intentional design |

**No blockers detected.** All patterns are intentional implementations, not stubs or incomplete code.

### Data-Flow Trace (Level 4)

**Plan 37-02 (Manual Stock Adjust):**
- Truth: "User adjusts stock, EK-price saved"
- Data variable: `purchasePriceCents` in StockAdjustModal state
- Source: User input (override) OR Produkt-EK (fallback)
- Flow: StockAdjustModal → useAdjustStock → POST /api/sync → sync.ts STOCK_ADJUST → stockMovements INSERT
- Result: ✓ FLOWING — Data moves from UI input → DB record with EK-price

**Plan 37-03 (PDF Import):**
- Truth: "PDF import captures EK from invoice, stores as restock movement"
- Data variable: `row.purchasePriceCents` from ParsedInvoiceRow
- Source: PDF parser output (pdfParser.ts)
- Flow: PDF parse → ImportScreen state → /api/stock/adjust → import.ts endpoint → stockMovements INSERT
- Result: ✓ FLOWING — EK from PDF flows through to DB

**Schema & STOCK_ADJUST in sync.ts:**
- Truth: "STOCK_ADJUST handler uses correct EK value"
- Data variable: `adj.purchasePriceCents` from Zod-validated payload
- Source: Client outbox entry (manual adjust) OR /api/sync POST body
- Flow: Payload validation → Ownership check → Fallback logic → INSERT
- Result: ✓ FLOWING — Payload validated, fallback working, inserted to DB

---

## Implementation Quality

### Threat Mitigations

All threat mitigations from PLAN frontmatter are present and working:

| Threat ID | Category | Mitigation | Status |
|-----------|----------|-----------|--------|
| T-37-01 | Tampering (purchase_price_cents) | Ownership check in sync.ts, value from authenticated session | ✓ PRESENT |
| T-37-02 | Information Disclosure | shopId-check in priceHistory.ts already implemented | ✓ PRESENT |
| T-37-03 | Tampering (purchasePriceCents Payload) | Zod validates `z.number().int().optional()` | ✓ PRESENT |
| T-37-04 | Tampering (Negative EK) | Server forces null when delta <= 0, regardless of payload | ✓ PRESENT |
| T-37-05 | Tampering (productId in /api/stock/adjust) | Ownership-check `adjustProd.shopId !== adj.shopId` before writes | ✓ PRESENT |
| T-37-06 | Tampering (delta negative in Import) | Zod: `z.number().int().positive()` on delta | ✓ PRESENT |
| T-37-07 | Tampering (EK = 0 or negative) | Zod: `z.number().int().positive()` on purchasePriceCents | ✓ PRESENT |
| T-37-08 | Elevation of Privilege (shopId mismatch) | Explicit session-shopId check → 403 | ✓ PRESENT |

### Deviations from Plan

None. All three plans executed exactly as specified in frontmatter.

### Known Gaps

None. All must-haves verified, all artifacts present and substantive, all links wired, data flowing correctly.

---

## Verification Checklist

- [x] Previous VERIFICATION.md checked (none existed — initial verification)
- [x] Must-haves established from PLAN frontmatter
- [x] All 12 truths verified with status and evidence
- [x] All 6 artifacts checked at three levels (exists, substantive, wired)
- [x] Data-flow traces run on wired artifacts
- [x] All key links verified (6 links, all WIRED)
- [x] Requirements coverage assessed (4 requirements, all SATISFIED)
- [x] Anti-patterns scanned (0 blockers)
- [x] Threat mitigations verified (8 mitigations, all present)
- [x] No human verification items needed (behavior testable via code inspection + data flow analysis)
- [x] Overall status determined: PASSED
- [x] No deferred items (all work completed in this phase)
- [x] Gaps list: EMPTY
- [x] VERIFICATION.md created with complete report

---

## Summary

**Phase 37 successfully achieves its goal.** All three plans executed without deviation:

1. **Plan 37-01:** DB schema extended with `purchasePriceCents` column and `restock` type documented. ✓ COMPLETE
2. **Plan 37-02:** Manual stock adjust extended with EK-price capture via toggle UI + server fallback logic. ✓ COMPLETE
3. **Plan 37-03:** PDF import captures EK from invoice, stores as restock movement, tracks price history. ✓ COMPLETE

**Result:** Every stock increase now records the cost-price as a separate stock_movement, fulfilling all four requirements (EINGANG-01, EINGANG-02, ANPASS-01, ANPASS-02) needed for Phase 38 (FIFO Inventory) to function correctly.

---

_Verified: 2026-04-09T16:30:00Z_
_Verifier: Claude (gsd-verifier)_
