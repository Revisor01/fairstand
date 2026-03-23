---
phase: 05-tech-debt-fixes
plan: 01
subsystem: sync, ui
tags: [drizzle, lww, conflict-resolution, offline-sync, reporting]

requires:
  - phase: 02-backend-sync
    provides: "Sync-Handler mit onConflictDoNothing und Stock-Delta"
  - phase: 03
    provides: "ProductList mit handleToggleActive und MonthlyReport"
provides:
  - "LWW-Konfliktaufloesung im Sync-Handler (onConflictDoUpdate)"
  - "Direkter PATCH fuer Produkt-Aktivierung/Deaktivierung"
  - "extra_donation_cents Anzeige im Monatsbericht"
affects: [05-02, deployment]

tech-stack:
  added: []
  patterns: ["LWW CASE WHEN Timestamp-Vergleich fuer alle Produkt-Felder im Sync"]

key-files:
  created: []
  modified:
    - server/src/routes/sync.ts
    - client/src/features/admin/products/ProductList.tsx
    - client/src/features/admin/reports/MonthlyReport.tsx

key-decisions:
  - "Stock im LWW-Block bewusst unveraendert belassen — Delta-Update danach separat"
  - "Fire-and-forget PATCH statt Outbox fuer Produkt-Toggle — einfacherer Ansatz"

patterns-established:
  - "LWW-Pattern: CASE WHEN excluded.updated_at > existing fuer alle Felder ausser stock"

requirements-completed: [TD-01, TD-02, TD-04]

duration: 2min
completed: 2026-03-23
---

# Phase 05 Plan 01: Tech Debt Fixes Summary

**LWW-Konfliktaufloesung im Sync-Handler, direkter PATCH fuer Produkt-Toggle, und Ueberzahlungs-Karte im Monatsbericht**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-23T18:37:24Z
- **Completed:** 2026-03-23T18:39:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Produkt-Upsert im SALE_COMPLETE-Handler nutzt jetzt onConflictDoUpdate mit Timestamp-LWW statt onConflictDoNothing
- Produkt-Deaktivierung/Aktivierung wird per direktem PATCH an den Server synchronisiert wenn online
- extra_donation_cents wird als 6. Karte "Ueberzahlung" im Monatsbericht angezeigt

## Task Commits

Each task was committed atomically:

1. **Task 1: LWW-Upsert in sync.ts (TD-01)** - `48f4691` (fix)
2. **Task 2: Direkter PATCH fuer Produkt-Toggle (TD-02)** - `52f0525` (fix)
3. **Task 3: extra_donation_cents im Monatsbericht (TD-04)** - `3d03172` (feat)

## Files Created/Modified
- `server/src/routes/sync.ts` - LWW onConflictDoUpdate mit CASE WHEN Timestamp-Vergleich fuer Produkte
- `client/src/features/admin/products/ProductList.tsx` - Fire-and-forget PATCH bei Produkt-Aktivierung/Deaktivierung
- `client/src/features/admin/reports/MonthlyReport.tsx` - 6. Karte "Ueberzahlung" mit amber-500 Akzentfarbe

## Decisions Made
- Stock im LWW-Block bewusst auf bestehenden Wert belassen (sql`${products.stock}`) — Delta-Update erfolgt danach separat in Zeile 97-100, sonst wuerde der Stock durch den Sale-Insert mit 0 ueberschrieben
- Fire-and-forget PATCH statt Outbox fuer Produkt-Toggle — einfacherer Ansatz, Server bekommt Status beim naechsten Download-Sync oder bei erneutem Online-Toggle

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - alle Werte sind an existierende Datenquellen angebunden.

## Next Phase Readiness
- TD-01, TD-02, TD-04 abgeschlossen
- TD-03 (Download-Sync Server->Client) ist Gegenstand von Plan 05-02

---
*Phase: 05-tech-debt-fixes*
*Completed: 2026-03-23*

## Self-Check: PASSED
- All 3 modified files exist
- All 3 task commits verified (48f4691, 52f0525, 3d03172)
