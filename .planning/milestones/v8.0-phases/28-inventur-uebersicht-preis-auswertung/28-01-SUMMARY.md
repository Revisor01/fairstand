---
phase: 28-inventur-uebersicht-preis-auswertung
plan: "01"
subsystem: api
tags: [fastify, drizzle, sqlite, postgresql, reports, inventory]

requires:
  - phase: 27-preis-history-und-audit
    provides: price_history and stock_movements tables, purchasePrice snapshot in sale items

provides:
  - GET /api/reports/inventory?year=XXXX endpoint
  - Per-article aggregation: sold_qty, revenue_cents, cost_cents, ek_breakdown
  - total_stock_value_cents summed from active products
  - EK-Aufschlüsselung per article (multiple EK prices when price changed mid-year)

affects:
  - 28-02 (frontend inventory view that consumes this endpoint)

tech-stack:
  added: []
  patterns:
    - "Three-query inventory pattern: (1) per-article aggregation with LEFT JOIN, (2) total stock value, (3) EK breakdown in single batch query to avoid N+1"
    - "COALESCE purchasePrice snapshot: item->>'purchasePrice' falls back to current p.purchase_price for historical accuracy"
    - "ekMap pattern: Map<productId, Array<{ek_cents, qty}>> built from batch query, merged in TypeScript"

key-files:
  created: []
  modified:
    - server/src/routes/reports.ts

key-decisions:
  - "Three separate queries (not one complex CTE) for clarity and maintainability: aggregate, stock value, EK breakdown"
  - "EK breakdown fetched in batch (not N+1) via single JOIN query, assembled into Map in TypeScript"
  - "COALESCE on purchasePrice snapshot ensures historical accuracy even when product EK changed after sale"

patterns-established:
  - "LEFT JOIN sales ON condition includes date filter — avoids cross-product explosion when no sales in period"
  - "LEFT JOIN jsonb_array_elements only on matched sales rows, not all products"

requirements-completed:
  - INV-01
  - INV-02
  - INV-03
  - PRICE-03

duration: 5min
completed: "2026-04-01"
---

# Phase 28 Plan 01: Inventur-Uebersicht-Preis-Auswertung Summary

**Backend-Endpoint GET /api/reports/inventory mit EK-Snapshot-basierter Jahresauswertung pro Artikel inkl. EK-Aufschlüsselung bei Preisänderungen**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-01T21:45:00Z
- **Completed:** 2026-04-01T21:46:27Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- GET /api/reports/inventory?year=XXXX liefert alle aktiven Produkte mit sold_qty, revenue_cents, cost_cents
- ek_breakdown pro Artikel zeigt bei Preisänderungen im Jahresverlauf korrekt mehrere EK-Stufen
- total_stock_value_cents = Summe aller aktiven Produkte × aktueller EK
- NULL purchasePrice in alten Sale-Items wird via COALESCE auf aktuellen Produktpreis aufgelöst
- TypeScript kompiliert ohne Fehler

## Task Commits

1. **Task 1: GET /api/reports/inventory Endpoint** - `02cb3b2` (feat)

**Plan metadata:** (see final commit)

## Files Created/Modified
- `server/src/routes/reports.ts` - Neuer /reports/inventory Endpoint hinzugefügt (103 Zeilen)

## Decisions Made
- Drei separate Queries statt einer komplexen CTE — leichter lesbar und wartbar
- EK-Aufschlüsselung als Batch-Query mit Map-Zusammenbau in TypeScript (kein N+1)
- LEFT JOIN sales mit Datumsfilter direkt in der ON-Bedingung, um Kreuzprodukt bei Produkten ohne Verkäufe zu vermeiden

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- GET /api/reports/inventory ist bereit für Phase 28-02 (Frontend-Ansicht)
- Endpoint liefert alle Felder die das Frontend benötigt: id, article_number, name, current_stock, current_ek_cents, sold_qty, revenue_cents, cost_cents, ek_breakdown

## Self-Check: PASSED

- server/src/routes/reports.ts: FOUND
- Commit 02cb3b2: FOUND

---
*Phase: 28-inventur-uebersicht-preis-auswertung*
*Completed: 2026-04-01*
