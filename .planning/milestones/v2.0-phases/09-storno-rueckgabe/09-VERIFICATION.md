---
phase: 09-storno-rueckgabe
verified: 2026-03-24T10:54:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 09: Storno & Rückgabe Verification Report

**Phase Goal:** Fehlgebuchte Verkäufe können korrigiert werden — Bestand wird korrekt zurückgebucht

**Verified:** 2026-03-24T10:54:00Z

**Status:** PASSED — All must-haves verified, no gaps found

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Aus der Tagesübersicht kann ein Verkauf vollständig storniert werden — alle enthaltenen Artikel werden im Bestand zurückgebucht | ✓ VERIFIED | SaleDetailModal.tsx (lines 14-47): `handleCancelSale()` writes `SALE_CANCEL` to outbox, updates `sale.cancelledAt`, reverts all items' stock. server/sync.ts (lines 165-197): Handler updates `sales.cancelledAt` + increments `products.stock` for all items. |
| 2 | Einzelne Artikel eines Verkaufs können als Rückgabe verbucht werden — nur der betroffene Artikel wird zurückgebucht | ✓ VERIFIED | SaleDetailModal.tsx (lines 49-79): `handleReturnItem()` writes `ITEM_RETURN` to outbox, marks item in `sale.returnedItems`, reverts only that item's stock. server/sync.ts (lines 198-222): Handler increments `products.stock` for single article. |
| 3 | Storno/Rückgabe funktioniert offline — Outbox-Einträge werden bei Reconnect synchronisiert | ✓ VERIFIED | client/db/schema.ts (line 44): OutboxEntry.operation extended to `'SALE_CANCEL' \| 'ITEM_RETURN'`. Both handlers in SaleDetailModal write to `db.outbox.add()`. Server sync route (sync.ts lines 73-222) processes all outbox operations in transaction. |
| 4 | Stornierte Verkäufe sind in der Tagesübersicht visuell erkennbar (durchgestrichen) | ✓ VERIFIED | DailyReport.tsx (lines 126-135): Cancelled rows styled with `sale.cancelledAt ? 'bg-red-50 hover:bg-red-100 opacity-60'` + line-through + "Storno" label. Uhrzeit-Zelle: `line-through text-red-400` when cancelled. |
| 5 | Rückgegebene Artikel sind im SaleDetailModal als zurückgegeben markiert | ✓ VERIFIED | SaleDetailModal.tsx (lines 131-161): Items checked via `sale.returnedItems?.includes(item.productId)` → row styled with `opacity-50 line-through text-slate-400`, button replaced with checkmark `✓`. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `client/src/db/schema.ts` | Dexie v4: `cancelledAt` on Sale, `returnedItems` on Sale, OutboxEntry.operation extended | ✓ VERIFIED | Lines 38-39: `cancelledAt?: number` + `returnedItems?: string[]`. Line 44: operation extended to `'SALE_CANCEL' \| 'ITEM_RETURN'`. v4 stores defined (line 85) with `cancelledAt` index. |
| `server/src/db/schema.ts` | Drizzle: `cancelledAt` column in sales table | ✓ VERIFIED | Line 28: `cancelledAt: integer('cancelled_at')` (nullable, no `.notNull()`). |
| `server/src/db/migrations/0004_add_cancelled_at.sql` | Migration SQL for adding column | ✓ VERIFIED | File exists with correct statement: `ALTER TABLE sales ADD COLUMN cancelled_at INTEGER;` |
| `server/src/routes/sync.ts` | Handler for SALE_CANCEL + ITEM_RETURN with stock reversal | ✓ VERIFIED | SaleCancelSchema (lines 45-50), SALE_CANCEL handler (lines 165-197) with `stock + quantity`. ItemReturnSchema (lines 52-58), ITEM_RETURN handler (lines 198-222) with `stock + quantity`. |
| `client/src/features/admin/reports/SaleDetailModal.tsx` | Stornieren-Button + per-Item Rückgabe-Buttons with Outbox logic | ✓ VERIFIED | Lines 14-47: Storno button with confirm, writes SALE_CANCEL to outbox. Lines 49-79: Return button per item, writes ITEM_RETURN to outbox. Line 153: Button disabled when `sale.cancelledAt` present. |
| `client/src/features/admin/reports/DailyReport.tsx` | Cancelled sales marked visually with strikethrough + red styling | ✓ VERIFIED | Lines 35-43: Stats filter out cancelled sales. Lines 126-135: Cancelled rows styled red + strikethrough. Lines 37-41: Kennzahlen recalculated excluding `s.cancelledAt`. |

### Key Link Verification

| From | To | Via | Pattern | Status | Details |
|------|----|----|---------|--------|---------|
| SaleDetailModal.tsx (Stornieren-Button) | db.outbox (SALE_CANCEL) | `db.outbox.add({ operation: 'SALE_CANCEL', ... })` | SALE_CANCEL | ✓ WIRED | Lines 32-43: outbox.add writes with operation='SALE_CANCEL', payload with saleId, items, cancelledAt. |
| SaleDetailModal.tsx (Stock update) | products.stock | `db.products.modify(p => p.stock += quantity)` | stock.*\+ | ✓ WIRED | Lines 24-29: For-loop increments stock locally for all sale.items. |
| SaleDetailModal.tsx (Rückgabe-Button) | db.outbox (ITEM_RETURN) | `db.outbox.add({ operation: 'ITEM_RETURN', ... })` | ITEM_RETURN | ✓ WIRED | Lines 63-75: outbox.add writes with operation='ITEM_RETURN', payload with saleId, productId, quantity. |
| SaleDetailModal.tsx (Return Stock) | products.stock | `db.products.modify(p => p.stock += quantity)` | stock.*\+ | ✓ WIRED | Lines 57-60: Single item stock incremented locally. |
| server/sync.ts (SALE_CANCEL handler) | products.stock | `sql\`${products.stock} + ${item.quantity}\`` | stock.*\+ | ✓ WIRED | Lines 180-185: Transaction increments stock for all items in cancelled sale. |
| server/sync.ts (SALE_CANCEL handler) | sales.cancelledAt | `tx.update(sales).set({ cancelledAt: ... })` | cancelledAt | ✓ WIRED | Lines 174-177: Sets cancelledAt timestamp idempotently. |
| server/sync.ts (ITEM_RETURN handler) | products.stock | `sql\`${products.stock} + ${ret.quantity}\`` | stock.*\+ | ✓ WIRED | Lines 207-210: Single item stock incremented in transaction. |
| DailyReport.tsx | SaleDetailModal props | `onSaleChanged={() => setSelectedSale(null)}` | onSaleChanged | ✓ WIRED | Line 159: Callback passed to trigger modal close after storno/return. |

**All key links verified — no orphaned or partial wiring found.**

### Requirements Coverage

| Requirement | Plan | Description | Status | Evidence |
|-------------|------|-------------|--------|----------|
| STOR-01 | 09-01 | Verkauf kann aus der Tagesübersicht storniert werden — Bestand wird zurückgebucht | ✓ SATISFIED | SaleDetailModal button writes SALE_CANCEL (line 33), server handler updates sales.cancelledAt (line 175) + products.stock (lines 180-185). DailyReport marks cancelled sales visually (line 127-128). |
| STOR-02 | 09-01 | Einzelne Artikel aus einem Verkauf können als Rückgabe verbucht werden | ✓ SATISFIED | Per-item "Zurück" buttons in SaleDetailModal (line 152), write ITEM_RETURN (line 64), server handler updates products.stock (lines 207-210). UI marks returned items (line 132-148). |

**Coverage:** All 2 requirements satisfied. No orphaned requirements.

### Anti-Patterns Found

**No anti-patterns detected.**

✓ No TODO/FIXME/PLACEHOLDER comments in modified files
✓ No stub implementations (empty returns, hardcoded empty data)
✓ No console.log-only handlers
✓ All operations write to outbox, not hardcoded to static responses

### Human Verification Required

**None.** All observable truths verified programmatically via code inspection and link tracing.

### Gaps Summary

**No gaps found.** Phase 09 goal fully achieved:

- ✓ Complete sale cancellation with full stock reversal (STOR-01)
- ✓ Individual item return with partial stock reversal (STOR-02)
- ✓ Offline-first outbox pattern with server sync
- ✓ Visual distinction for cancelled sales and returned items
- ✓ Requirement coverage: 100% (2/2 requirements satisfied)

---

_Verified: 2026-03-24T10:54:00Z_
_Verifier: Claude (gsd-verifier)_
