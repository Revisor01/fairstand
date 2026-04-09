---
phase: 39-bestandswarnungen-ux
plan: 01
subsystem: ui
tags: [react, lucide-react, tailwind, pos, low-stock]

# Dependency graph
requires: []
provides:
  - StockAlertButton-Komponente mit Bell-Icon, rotem Badge-Zaehler und Klick-Popover
  - LowStockBanner entfernt aus POS-Header
affects: [pos, bestandswarnungen]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bell-Icon mit Badge + Popover fuer Bestandswarnungen statt Banner-Leiste"
    - "Sortierung nach relativem Bestand (stock/minStock) fuer Dringlichkeitsreihenfolge"

key-files:
  created:
    - client/src/features/pos/StockAlertButton.tsx
  modified:
    - client/src/features/pos/POSScreen.tsx
  deleted:
    - client/src/features/pos/LowStockBanner.tsx

key-decisions:
  - "LowStockBanner.tsx geloescht statt auf leeren Export reduziert — kein weiterer Import ausserhalb POSScreen"
  - "StockAlertButton vor ShoppingCart-Button im Header platziert (links davon)"
  - "Popover schliesst bei Klick ausserhalb via mousedown EventListener mit useEffect Cleanup"

patterns-established:
  - "Popover-Pattern: useRef + useEffect mousedown fuer Click-Outside-Close"

requirements-completed: [WARN-01, WARN-02]

# Metrics
duration: 10min
completed: 2026-04-09
---

# Phase 39 Plan 01: Bestandswarnungen-UX Summary

**LowStockBanner-Leiste durch Bell-Icon mit Badge-Zaehler und Klick-Popover im POS-Header ersetzt — Warnliste nach relativem Bestand sortiert**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-09
- **Completed:** 2026-04-09
- **Tasks:** 1
- **Files modified:** 3 (1 erstellt, 1 geaendert, 1 geloescht)

## Accomplishments
- StockAlertButton.tsx neu erstellt: Bell-Icon ohne Badge wenn keine Warnungen (gedimmt), mit rotem Badge-Zaehler wenn Warnungen vorhanden
- Popover zeigt Warnliste sortiert nach relativem Bestand (stock/minStock aufsteigend) — kritischste Artikel zuerst
- LowStockBanner-Leiste vollstaendig aus POSScreen entfernt; LowStockBanner.tsx geloescht
- TypeScript-Kompilierung fehlerfrei

## Task Commits

1. **Task 1: StockAlertButton erstellen und LowStockBanner ersetzen** - `26b53f1` (feat)

## Files Created/Modified
- `client/src/features/pos/StockAlertButton.tsx` - Neue Komponente: Bell-Icon mit Badge + Popover-Warnliste, useLowStockProducts()-Hook
- `client/src/features/pos/POSScreen.tsx` - LowStockBanner-Import und JSX-Verwendung entfernt, StockAlertButton vor ShoppingCart eingefuegt
- `client/src/features/pos/LowStockBanner.tsx` - Geloescht (deprecated)

## Decisions Made
- LowStockBanner.tsx vollstaendig geloescht statt leer gelassen, da kein Import ausserhalb POSScreen.tsx existiert
- StockAlertButton vor dem ShoppingCart-Button positioniert (links im Header-Flex), symmetrisch zum bestehenden Settings-Badge

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Bestandswarnungen-UX vollstaendig abgeschlossen
- Phase 39 abgeschlossen

---
*Phase: 39-bestandswarnungen-ux*
*Completed: 2026-04-09*
