---
phase: 25-shop-sortiment-isolation
plan: "02"
subsystem: api
tags: [sync, shopId, security, import, fastify, drizzle]

requires:
  - phase: 25-01
    provides: Shop-Isolierung auf DB-Ebene (shopId in Produkt-Tabelle, products.ts GET filtert nach session.shopId)
  - phase: 24-02
    provides: Session-Auth mit shopId-Validierung in Middleware

provides:
  - shopId-Ownership-Check vor jedem Stock-Delta in sync.ts (SALE_COMPLETE, STOCK_ADJUST, SALE_CANCEL, ITEM_RETURN)
  - ImportScreen.tsx holt Produkte ohne shopId Query-Param — konsistentes Session-Pattern

affects: [sync, import, stock-management, shop-isolation]

tech-stack:
  added: []
  patterns:
    - "Ownership-Check Pattern: Produkt per SELECT laden, shopId gegen entry.shopId prüfen, danach erst UPDATE"
    - "Cross-Shop-Schutz: manipulierte productIds in Sync-Payloads werden still übersprungen (SALE) oder als Fehler markiert (STOCK_ADJUST, ITEM_RETURN)"
    - "Session-Only Produkt-Fetch: kein shopId Query-Param — Server filtert per Middleware"

key-files:
  created: []
  modified:
    - server/src/routes/sync.ts
    - client/src/features/admin/import/ImportScreen.tsx

key-decisions:
  - "SALE_COMPLETE und SALE_CANCEL: fremde Produkte still überspringen (continue) — Batch soll nicht komplett scheitern"
  - "STOCK_ADJUST und ITEM_RETURN: fremde Produkte als Fehler markieren (errors.push) — explizit, da gezielter Einzel-Adjust"
  - "entry.shopId statt session.shopId für Ownership-Check — entry.shopId ist bereits gegen session.shopId validiert (Zeilen 72-76)"

patterns-established:
  - "Vor jedem tx.update(products): Produkt laden, shopId gegen entry.shopId prüfen"

requirements-completed: [SELF-02, SELF-03]

duration: 8min
completed: "2026-03-25"
---

# Phase 25 Plan 02: Stock-Delta shopId-Validierung + Import-Bereinigung Summary

**shopId-Ownership-Check vor allen vier Stock-Delta-Operationen in sync.ts und Entfernung des inkonsistenten Query-Params im ImportScreen**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-25T00:25:00Z
- **Completed:** 2026-03-25T00:27:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- sync.ts verhindert Cross-Shop-Stock-Manipulation: alle vier Operationen prüfen Ownership vor Update
- ImportScreen holt Produkte konsistent per Session (kein Query-Param), neue Produkte erhalten weiterhin shopId aus getShopId()
- TypeScript-Build beider Pakete ohne Fehler

## Task Commits

1. **Task 1: shopId-Validierung vor Stock-Deltas in sync.ts** - `916bddd` (fix)
2. **Task 2: ImportScreen — shopId Query-Param entfernen** - `2f40b8e` (fix)

## Files Created/Modified

- `server/src/routes/sync.ts` — Ownership-Checks vor SALE_COMPLETE, STOCK_ADJUST, SALE_CANCEL, ITEM_RETURN Stock-Updates
- `client/src/features/admin/import/ImportScreen.tsx` — `/api/products?shopId=...` zu `/api/products` vereinfacht

## Decisions Made

- SALE und SALE_CANCEL überspringen fremde Produkte still (continue): Batch soll nicht komplett scheitern wenn ein einzelnes Item ungültig ist
- STOCK_ADJUST und ITEM_RETURN pushen Fehler in errors-Array: diese Operationen sind gezielt, Fehler soll sichtbar sein
- entry.shopId (nicht session.shopId) für den Produktvergleich: entry.shopId ist bereits gegen session.shopId validiert — semantisch dasselbe, aber direkter für den Kontext

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - keine externen Dienste.

## Next Phase Readiness

- Shop-Isolation ist vollständig: Produkte (25-01), Stock-Deltas (25-02) — kein Cross-Shop-Update mehr möglich
- Bereit für weiteren Phasen-Ausbau (responsive Layout, Warenkorb-Design)

---
*Phase: 25-shop-sortiment-isolation*
*Completed: 2026-03-25*
