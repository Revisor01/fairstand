---
phase: 36-ek-preiswarnung-beim-import
plan: 01
subsystem: ui
tags: [react, typescript, import, pdf-import, review-table]

# Dependency graph
requires:
  - phase: []
    provides: []
provides:
  - EK-Warnzeile in ReviewTable bei Abweichung zwischen gespeichertem und importiertem Einkaufspreis
  - storedPurchasePriceCents in MatchedRow-Interface und ImportScreen-Matching
affects:
  - 36-ek-preiswarnung-beim-import

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EK-Vergleich: storedPurchasePriceCents (gespeichert) vs. purchasePriceCents (importiert) in MatchedRow"
    - "Warnzeile als separates <tr> nach Hauptzeile im Fragment-Pattern der ReviewTable"

key-files:
  created: []
  modified:
    - client/src/features/admin/import/ReviewTable.tsx
    - client/src/features/admin/import/ImportScreen.tsx

key-decisions:
  - "Warnzeile als amber-50-Zeile nach parseWarning-Block, gleiche colSpan=9-Struktur"
  - "storedPurchasePriceCents optional im Interface — nur bei status='known' befüllt"

patterns-established:
  - "Fragment-Pattern in ReviewTable: Hauptzeile + optionale Zusatzzeilen (parseWarning, ekwarn) pro Artikel"

requirements-completed:
  - IMP-01

# Metrics
duration: 5min
completed: 2026-04-03
---

# Phase 36 Plan 01: EK-Preiswarnung beim Import Summary

**EK-Abweichungswarnung im PDF-Import-Review: amber Warnzeile zeigt alten vs. neuen Einkaufspreis bei bekannten Artikeln**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-03T22:13:15Z
- **Completed:** 2026-04-03T22:18:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- `MatchedRow`-Interface um optionales Feld `storedPurchasePriceCents` erweitert
- Matching-Logik in `ImportScreen` befüllt `storedPurchasePriceCents` aus gematchtem Produkt (`match?.purchasePrice`)
- `ReviewTable` zeigt bei bekannten Artikeln mit geändertem EK eine amber-Warnzeile mit altem und neuem Wert
- Neue Artikel (`status='new'`) und unveränderte EK-Werte erhalten keine Warnzeile

## Task Commits

Jeder Task wurde atomisch committed:

1. **Task 1: MatchedRow um storedPurchasePriceCents erweitern + Matching anpassen** - `2af1302` (feat)

**Plan metadata:** folgt (docs-Commit)

## Files Created/Modified
- `client/src/features/admin/import/ReviewTable.tsx` - Interface erweitert, EK-Warnzeile eingefügt
- `client/src/features/admin/import/ImportScreen.tsx` - storedPurchasePriceCents im matchedRows-Mapping befüllt

## Decisions Made
- Warnzeile verwendet `amber-50` Hintergrund und `amber-700` Text — konsistent mit bestehender parseWarning-Zeile
- `storedPurchasePriceCents` ist optional im Interface, da nur bei bekannten Artikeln verfügbar

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npm run build --workspace=client` schlug fehl, da kein Workspace-Eintrag in der root `package.json`. TypeScript-Check direkt im `client/`-Verzeichnis via `npx tsc --noEmit` verwendet — erfolgreich ohne Fehler.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- EK-Preiswarnung vollstaendig implementiert, Phase 36 abgeschlossen
- Keine Blocker

---
*Phase: 36-ek-preiswarnung-beim-import*
*Completed: 2026-04-03*
