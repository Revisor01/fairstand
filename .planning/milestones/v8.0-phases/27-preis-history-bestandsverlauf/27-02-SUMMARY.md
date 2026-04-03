---
phase: 27-preis-history-bestandsverlauf
plan: "02"
subsystem: api
tags: [drizzle, audit-logging, price-history, stock-movements, fastify, postgresql]

requires:
  - phase: 27-01
    provides: priceHistories- und stockMovements-Tabellen im Schema (Drizzle + Migration)

provides:
  - POST /products loggt EK/VK-Änderungen atomar in price_histories (nur bei existierenden Produkten, nur bei tatsächlicher Änderung)
  - DELETE /sales/:id loggt Restock-Bewegungen mit type='hard_delete' in stock_movements (nur wenn Verkauf nicht storniert)

affects:
  - 27-03
  - phase-28
  - phase-29

tech-stack:
  added: []
  patterns:
    - "Preis-Logging-Pattern: SELECT existing BEFORE Upsert innerhalb einer Transaktion — atomares Read-then-Write"
    - "Hard-Delete-Audit: stock_movements mit type='hard_delete' und referenceSaleId für Nachvollziehbarkeit nach Sale-Löschung"

key-files:
  created: []
  modified:
    - server/src/routes/products.ts
    - server/src/routes/sales.ts

key-decisions:
  - "Preis-Logging nur bei existierenden Produkten — neues Produkt hat keinen 'alten Preis'"
  - "stock_movements INSERT steht innerhalb des if (!sale.cancelledAt) Blocks — kein Restock-Log für bereits stornierte Sales"
  - "referenceSaleId referenziert gelöschten Sale — Nachvollziehbarkeit bleibt erhalten, auch wenn sale-Zeile danach weg ist"
  - "LWW-Upsert-Logik in products.ts bleibt 1:1 unverändert — nur in db.transaction eingewickelt"

patterns-established:
  - "Audit-Logging-Pattern: Bestehenden Wert VOR dem Schreibvorgang lesen, dann INSERT in Audit-Tabelle, dann eigentlicher Schreibvorgang — alles in einer Transaktion"

requirements-completed:
  - PRICE-01
  - INV-04

duration: 8min
completed: 2026-04-01
---

# Phase 27 Plan 02: App-Layer Audit-Logging Summary

**Preis-History und Restock-Audit: POST /products loggt EK/VK-Änderungen in price_histories, DELETE /sales/:id loggt Hard-Delete-Restock in stock_movements — jeweils atomar per db.transaction**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-01T16:35:00Z
- **Completed:** 2026-04-01T16:43:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- POST /products wickelt den LWW-Upsert in eine db.transaction ein und liest den bestehenden Preis vor dem Upsert — loggt purchase_price und sale_price Änderungen separat in price_histories
- DELETE /sales/:id fügt innerhalb des bestehenden Restock-Loops einen stock_movements INSERT mit type='hard_delete' ein — nur für nicht-stornierte Sales
- TypeScript kompiliert fehlerfrei, keine Breaking Changes an anderen Route-Handlern

## Task Commits

1. **Task 1 + 2: Audit-Logging in products.ts und sales.ts** - `9824af6` (feat)

**Plan metadata:** wird nach diesem Summary committed

## Files Created/Modified
- `server/src/routes/products.ts` - Import erweitert (priceHistories), POST /products in db.transaction eingewickelt mit vorgelagertem SELECT und bedingtem INSERT in price_histories
- `server/src/routes/sales.ts` - Import erweitert (stockMovements), Restock-Loop in DELETE /sales/:id um stock_movements INSERT ergänzt

## Decisions Made
- Preis-Logging nur bei existierenden Produkten: neues Produkt hat keinen "alten Preis", daher kein Log-Eintrag bei INSERT
- Nur tatsächliche Änderungen werden geloggt (oldValue !== newValue) — keine Rauscheinträge bei unverändertem Sync
- referenceSaleId zeigt auf gelöschten Sale — die ID bleibt im stock_movements Eintrag erhalten, auch wenn die Sale-Zeile danach nicht mehr existiert

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PRICE-01 vollständig implementiert: Schema (27-01) + App-Layer-Logging (27-02)
- INV-04 vollständig implementiert: Hard-Delete-Restock wird in stock_movements protokolliert
- Phase 27-03 kann auf price_histories und stock_movements READ-Endpoints aufbauen
- Phase 28 (Inventur-Auswertung) und Phase 29 (Rechnungsexport) haben vollständige Audit-Trail-Grundlage

## Self-Check: PASSED

- server/src/routes/products.ts: FOUND
- server/src/routes/sales.ts: FOUND
- .planning/phases/27-preis-history-bestandsverlauf/27-02-SUMMARY.md: FOUND
- Commit 9824af6: FOUND
- TypeScript: 0 Fehler

---
*Phase: 27-preis-history-bestandsverlauf*
*Completed: 2026-04-01*
